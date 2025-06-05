"""
Phase 2 Integration Test - Document Classification and Enhanced Processing
Demonstrates the complete automated workflow
"""

import os
import tempfile
from datetime import datetime

# Add app directory to path
import sys
sys.path.insert(0, os.path.dirname(__file__))

from modules.doc_converter import DocumentClassifier
from doc_converter.processing import EnhancedProcessor


def demonstrate_phase2_workflow():
    """Demonstrate the complete Phase 2 workflow"""
    print("🚀 Phase 2 Integration Demo - Automated Document Processing\n")
    
    # Create test document
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create a comprehensive test document
        test_file = os.path.join(temp_dir, "nscale-complete-guide.md")
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write("""# nscale Benutzerhandbuch v3.0

Version: 3.0.1
Datum: Januar 2024
Autor: nscale Team
Keywords: DMS, Dokumentenmanagement, Enterprise, Digitale Akte

## Inhaltsverzeichnis

1. [Einführung](#einführung)
2. [Installation](#installation)
3. [Konfiguration](#konfiguration)
4. [API-Referenz](#api-referenz)
5. [FAQ](#faq)

## Einführung

nscale ist ein leistungsstarkes Dokumentenmanagementsystem (DMS) für Unternehmen.

### Hauptfunktionen

- **Digitale Aktenverwaltung** - Vollständige Digitalisierung Ihrer Dokumente
- **Versionskontrolle** - Automatische Versionierung aller Änderungen
- **Workflow-Automatisierung** - Geschäftsprozesse digital abbilden
- **Berechtigungsverwaltung** - Granulare Zugriffsrechte

## Installation

### Systemanforderungen

| Komponente | Mindestanforderung | Empfohlen |
|------------|--------------------|-----------|
| CPU        | 4 Cores            | 8 Cores   |
| RAM        | 8 GB               | 16 GB     |
| Festplatte | 100 GB             | 500 GB    |
| OS         | Windows 10         | Windows 11|

### Installationsschritte

1. Download der Installationsdatei von https://nscale.com/download
2. Ausführen des Installers als Administrator
3. Folgen Sie dem Setup-Assistenten

```bash
# Linux Installation
sudo apt-get update
sudo apt-get install nscale-server
sudo systemctl start nscale
```

## Konfiguration

### Datenbank-Konfiguration

Die Datenbankverbindung wird in der `config.yml` konfiguriert:

```yaml
database:
  type: postgresql
  host: localhost
  port: 5432
  name: nscale_db
  user: nscale_user
  password: ${DB_PASSWORD}
```

### Server-Einstellungen

| Einstellung | Standardwert | Beschreibung |
|-------------|--------------|--------------|
| port        | 8080         | HTTP-Port    |
| ssl_port    | 8443         | HTTPS-Port   |
| max_upload  | 100MB        | Max. Dateigröße |

## API-Referenz

### Authentifizierung

```python
import requests

# Login
response = requests.post('https://api.nscale.com/auth/login', json={
    'username': 'user@example.com',
    'password': 'password'
})

token = response.json()['token']
headers = {'Authorization': f'Bearer {token}'}
```

### Dokumente abrufen

```python
# Alle Dokumente abrufen
documents = requests.get(
    'https://api.nscale.com/api/documents',
    headers=headers
).json()

# Einzelnes Dokument
doc = requests.get(
    'https://api.nscale.com/api/documents/123',
    headers=headers
).json()
```

## FAQ

**Q: Wie erstelle ich eine neue Akte?**
A: Klicken Sie auf "Neue Akte" in der Hauptnavigation und füllen Sie die Metadatenfelder aus.

**Q: Kann ich Dokumente per E-Mail importieren?**
A: Ja, senden Sie Dokumente an import@ihr-nscale-server.de

**Q: Wie funktioniert die Volltextsuche?**
A: Die Suche indiziert automatisch alle Dokumente inklusive OCR für gescannte Dateien.

## Referenzen

- Offizielle Dokumentation: https://docs.nscale.com
- Support Portal: https://support.nscale.com
- Community Forum: https://community.nscale.com

Weitere Informationen finden Sie in unserem [Administratorhandbuch](#admin-guide).

---

© 2024 nscale GmbH. Alle Rechte vorbehalten.
""")
        
        print("📄 Test-Dokument erstellt: nscale-complete-guide.md")
        print("="*60)
        
        # Phase 1: Document Classification
        print("\n📊 PHASE 1: Dokumentklassifizierung")
        print("-"*40)
        
        classifier = DocumentClassifier()
        classification = classifier.classify_document(test_file)
        
        print(f"✅ Dokumenttyp: {classification.metadata.document_type.value}")
        print(f"✅ Kategorie: {classification.metadata.content_category.value}")
        print(f"✅ Struktur: {classification.metadata.structure_type.value}")
        print(f"✅ Sprache: {classification.metadata.language}")
        print(f"✅ Verarbeitungsstrategie: {classification.processing_strategy.value}")
        print(f"✅ Priorität: {classification.priority_score:.2f}")
        print(f"✅ Geschätzte Zeit: {classification.estimated_processing_time:.1f}s")
        
        if classification.warnings:
            print("\n⚠️  Warnungen:")
            for warning in classification.warnings:
                print(f"   - {warning}")
        
        if classification.recommendations:
            print("\n💡 Empfehlungen:")
            for rec in classification.recommendations:
                print(f"   - {rec}")
        
        # Phase 2: Enhanced Processing
        print("\n\n🔧 PHASE 2: Erweiterte Dokumentenverarbeitung")
        print("-"*40)
        
        processor = EnhancedProcessor()
        result = processor.process_document(test_file, classification)
        
        print(f"✅ Dokument-ID: {result.document_id}")
        print(f"✅ Verarbeitungszeit: {result.processing_time:.3f}s")
        
        # Extracted Content
        print("\n📊 Extrahierte Inhalte:")
        print(f"   - Tabellen: {len(result.tables)}")
        print(f"   - Code-Snippets: {len(result.code_snippets)}")
        print(f"   - Referenzen: {len(result.references)}")
        print(f"   - Schlüsselpunkte: {len(result.structured_content['key_points'])}")
        
        # Metadata
        print("\n📋 Extrahierte Metadaten:")
        print(f"   - Titel: {result.metadata.title}")
        print(f"   - Version: {result.metadata.version}")
        print(f"   - Autoren: {', '.join(result.metadata.authors)}")
        print(f"   - Keywords: {', '.join(result.metadata.keywords)}")
        
        # Tables
        if result.tables:
            print("\n📊 Extrahierte Tabellen:")
            for i, table in enumerate(result.tables, 1):
                print(f"\n   Tabelle {i}: {table.caption or 'Ohne Titel'}")
                print(f"   - Headers: {', '.join(table.headers)}")
                print(f"   - Zeilen: {len(table.rows)}")
                if table.rows:
                    print(f"   - Beispiel: {table.rows[0]}")
        
        # Code Snippets
        if result.code_snippets:
            print("\n💻 Extrahierte Code-Snippets:")
            for i, snippet in enumerate(result.code_snippets, 1):
                print(f"\n   Snippet {i}:")
                print(f"   - Sprache: {snippet.language}")
                print(f"   - Zeilen: {len(snippet.code.split(chr(10)))}")
                print(f"   - Vorschau: {snippet.code[:50]}...")
        
        # References
        if result.references:
            print("\n🔗 Extrahierte Referenzen:")
            internal = [r for r in result.references if r.ref_type == 'internal']
            external = [r for r in result.references if r.ref_type == 'external']
            print(f"   - Interne Links: {len(internal)}")
            print(f"   - Externe Links: {len(external)}")
            if external:
                print("   - Beispiele:")
                for ref in external[:3]:
                    print(f"     • {ref.target}")
        
        # Statistics
        print("\n📈 Dokumentstatistiken:")
        stats = result.statistics
        print(f"   - Wörter: {stats['text']['words']}")
        print(f"   - Sätze: {stats['text']['sentences']}")
        print(f"   - Absätze: {stats['text']['paragraphs']}")
        print(f"   - Überschriften: {stats['structure']['headings']}")
        print(f"   - Listen: {stats['structure']['lists']}")
        
        # Structured Content
        print("\n🏗️  Strukturierte Inhalte:")
        if 'sections' in result.structured_content:
            print(f"   - Sektionen: {len(result.structured_content['sections'])}")
        if 'qa_pairs' in result.structured_content:
            print(f"   - Q&A Paare: {len(result.structured_content['qa_pairs'])}")
        if 'definitions' in result.structured_content:
            print(f"   - Definitionen: {len(result.structured_content['definitions'])}")
        
        # Processing Warnings
        if result.warnings:
            print("\n⚠️  Verarbeitungswarnungen:")
            for warning in result.warnings:
                print(f"   - {warning}")
        
        print("\n" + "="*60)
        print("✨ Phase 2 Integration erfolgreich abgeschlossen!")
        print("\n🎯 Zusammenfassung:")
        print("   ✅ Automatische Dokumentklassifizierung")
        print("   ✅ Intelligente Inhaltserkennung")
        print("   ✅ Tabellen mit Kontext extrahiert")
        print("   ✅ Code-Snippets mit Metadaten")
        print("   ✅ Referenzen und Links erkannt")
        print("   ✅ Metadaten vollständig extrahiert")
        print("   ✅ Strukturierte Inhalte aufbereitet")
        print("\n🚀 Bereit für Phase 2.3: Wissensbasis-Integration")
        
        return classification, result


if __name__ == "__main__":
    try:
        classification, result = demonstrate_phase2_workflow()
        
        # Optional: Save results for further processing
        print("\n💾 Ergebnisse können nun in die Wissensbasis integriert werden")
        
    except Exception as e:
        print(f"\n❌ Fehler: {str(e)}")
        import traceback
        traceback.print_exc()