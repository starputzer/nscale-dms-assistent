"""
Phase 2 Complete Integration Demo
Demonstrates the full automated document processing pipeline:
1. Classification
2. Enhanced Processing
3. Knowledge Base Integration
"""

import os
import tempfile
import shutil
from datetime import datetime

# Add app directory to path
import sys
sys.path.insert(0, os.path.dirname(__file__))

from modules.doc_converter import DocumentClassifier
from doc_converter.processing import EnhancedProcessor
from modules.rag.knowledge_manager import create_knowledge_manager


def demonstrate_complete_workflow():
    """Demonstrate the complete Phase 2 workflow with multiple documents"""
    print("🚀 Phase 2 Complete Integration Demo - Automated RAG Document Processing\n")
    
    # Create temporary directory for demo
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "demo_knowledge.db")
    
    try:
        # Initialize components
        classifier = DocumentClassifier()
        processor = EnhancedProcessor()
        knowledge_mgr = create_knowledge_manager(db_path)
        
        # Create test documents
        documents = [
            {
                'filename': 'nscale-user-manual-v1.md',
                'content': """# nscale Benutzerhandbuch
Version: 1.0
Datum: Januar 2024
Autor: nscale Documentation Team

## Einführung

nscale ist ein leistungsstarkes Dokumentenmanagementsystem (DMS) für Unternehmen.

### Hauptfunktionen

- **Digitale Aktenverwaltung** - Vollständige Digitalisierung
- **Versionskontrolle** - Automatische Versionierung
- **Workflow-Automatisierung** - Prozesse digitalisieren

## Installation

Siehe [Installationsanleitung](#installation-guide) für Details.

### Systemanforderungen

| Komponente | Minimum | Empfohlen |
|------------|---------|-----------|
| CPU        | 4 Cores | 8 Cores   |
| RAM        | 8 GB    | 16 GB     |
| Disk       | 100 GB  | 500 GB    |

## Erste Schritte

```bash
# nscale starten
systemctl start nscale
```

Weitere Informationen: https://docs.nscale.com
"""
            },
            {
                'filename': 'nscale-installation-guide.md',
                'content': """# nscale Installationsanleitung
Version: 1.0
Autor: nscale Team

## Übersicht

Diese Anleitung beschreibt die Installation von nscale.

## Voraussetzungen

Bevor Sie beginnen, lesen Sie das [Benutzerhandbuch](#user-manual).

### Software-Anforderungen

- Betriebssystem: Windows 10/11, Linux
- Datenbank: PostgreSQL 12+
- Java Runtime: JRE 11+

## Installationsschritte

1. Download der Installationsdateien
2. Entpacken des Archives
3. Ausführen des Installers

```bash
# Linux Installation
wget https://nscale.com/download/nscale-latest.tar.gz
tar -xzf nscale-latest.tar.gz
cd nscale
./install.sh
```

## Konfiguration

Nach der Installation siehe [Konfigurationshandbuch](#configuration).

## Troubleshooting

Bei Problemen konsultieren Sie die [FAQ](#faq) oder kontaktieren Sie support@nscale.com.
"""
            },
            {
                'filename': 'nscale-user-manual-v2.md',
                'content': """# nscale Benutzerhandbuch
Version: 2.0
Datum: März 2024
Autor: nscale Documentation Team

## Einführung

nscale ist ein leistungsstarkes Dokumentenmanagementsystem (DMS) für Unternehmen.

### Neue Features in Version 2.0

- **KI-gestützte Suche** - Intelligente Dokumentensuche
- **Mobile App** - Zugriff von überall
- **Erweiterte API** - Bessere Integration

### Hauptfunktionen

- **Digitale Aktenverwaltung** - Vollständige Digitalisierung
- **Versionskontrolle** - Automatische Versionierung
- **Workflow-Automatisierung** - Prozesse digitalisieren
- **Cloud-Integration** - Nahtlose Cloud-Anbindung

## Installation

Siehe aktualisierte [Installationsanleitung](#installation-guide) für Details.

### Systemanforderungen

| Komponente | Minimum | Empfohlen |
|------------|---------|-----------|
| CPU        | 4 Cores | 8 Cores   |
| RAM        | 16 GB   | 32 GB     |
| Disk       | 200 GB  | 1 TB      |

## API-Nutzung

```python
from nscale import Client

client = Client(api_key="your-key")
docs = client.documents.list()
```

## Migration von Version 1.x

Für Upgrade-Anweisungen siehe [Migrationshandbuch](#migration).

Weitere Informationen: https://docs.nscale.com/v2
"""
            },
            {
                'filename': 'nscale-faq.md',
                'content': """# nscale FAQ - Häufig gestellte Fragen

## Allgemeine Fragen

**Q: Was ist nscale?**
A: nscale ist ein Enterprise-Dokumentenmanagementsystem (DMS) für die digitale Verwaltung von Dokumenten und Geschäftsprozessen.

**Q: Welche Dateiformate werden unterstützt?**
A: nscale unterstützt alle gängigen Formate: PDF, DOCX, XLSX, PPTX, TXT, HTML, XML und viele mehr.

**Q: Ist nscale DSGVO-konform?**
A: Ja, nscale erfüllt alle Anforderungen der DSGVO und bietet umfassende Datenschutzfunktionen.

## Installation und Setup

**Q: Wie installiere ich nscale?**
A: Folgen Sie der [Installationsanleitung](#installation-guide). Die Installation dauert typischerweise 30-60 Minuten.

**Q: Kann ich nscale in der Cloud betreiben?**
A: Ja, nscale kann sowohl On-Premise als auch in der Cloud (AWS, Azure, etc.) betrieben werden.

## Benutzung

**Q: Wie erstelle ich eine neue Akte?**
A: Klicken Sie auf "Neue Akte" und füllen Sie die Metadatenfelder aus. Details im [Benutzerhandbuch](#user-manual).

**Q: Wie funktioniert die Volltextsuche?**
A: nscale indiziert automatisch alle Dokumente. Nutzen Sie die Suchleiste für Volltextsuche.

## Troubleshooting

**Q: Was tun bei Login-Problemen?**
A: Prüfen Sie:
1. Korrekte URL
2. Benutzername/Passwort
3. Netzwerkverbindung
4. Kontaktieren Sie ggf. Ihren Administrator

**Q: Dokumente werden nicht angezeigt?**
A: Überprüfen Sie Ihre Berechtigungen. Nur Dokumente mit entsprechenden Rechten sind sichtbar.

Weitere Hilfe: support@nscale.com
"""
            }
        ]
        
        # Process each document
        print("📁 Verarbeite Dokumente...\n")
        results = []
        
        for doc_info in documents:
            print(f"\n{'='*60}")
            print(f"📄 Dokument: {doc_info['filename']}")
            print(f"{'='*60}")
            
            # Save document
            file_path = os.path.join(temp_dir, doc_info['filename'])
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(doc_info['content'])
            
            # Phase 1: Classification
            print("\n📊 Phase 1: Klassifizierung")
            classification = classifier.classify_document(file_path)
            print(f"  ✓ Typ: {classification.metadata.document_type.value}")
            print(f"  ✓ Kategorie: {classification.metadata.content_category.value}")
            print(f"  ✓ Strategie: {classification.processing_strategy.value}")
            print(f"  ✓ Priorität: {classification.priority_score:.2f}")
            
            # Phase 2: Enhanced Processing
            print("\n🔧 Phase 2: Erweiterte Verarbeitung")
            processed = processor.process_document(file_path, classification)
            print(f"  ✓ Tabellen: {len(processed.tables)}")
            print(f"  ✓ Code-Snippets: {len(processed.code_snippets)}")
            print(f"  ✓ Referenzen: {len(processed.references)}")
            print(f"  ✓ Metadaten: v{processed.metadata.version}")
            
            # Phase 3: Knowledge Integration
            print("\n🧠 Phase 3: Wissensbasis-Integration")
            integration = knowledge_mgr.integrate_document(processed)
            print(f"  ✓ Status: {integration.status}")
            
            if integration.duplicates_found:
                print(f"  ⚡ Duplikate gefunden: {len(integration.duplicates_found)}")
                for dup in integration.duplicates_found:
                    print(f"     - {dup.existing_doc_id}: {dup.duplicate_type} "
                          f"(Ähnlichkeit: {dup.similarity_score:.2%})")
            
            if integration.cross_references_created:
                print(f"  ⚡ Querverweise erstellt: {len(integration.cross_references_created)}")
                for ref in integration.cross_references_created[:3]:
                    print(f"     - → {ref.target_doc_id} ({ref.reference_type})")
            
            if integration.updates_applied:
                print(f"  ⚡ Updates angewendet: {len(integration.updates_applied)}")
                for update in integration.updates_applied:
                    print(f"     - {update.update_type}: v{update.previous_version} → v{update.new_version}")
            
            results.append({
                'filename': doc_info['filename'],
                'classification': classification,
                'processed': processed,
                'integration': integration
            })
        
        # Show knowledge graph
        print(f"\n\n{'='*60}")
        print("📊 Wissensbasis-Übersicht")
        print(f"{'='*60}")
        
        # Search for related documents
        print("\n🔍 Suche nach verwandten Dokumenten...")
        search_results = knowledge_mgr.search_similar_documents("installation", limit=5)
        
        print(f"\nSuchergebnisse für 'installation':")
        for result in search_results:
            print(f"  - {result['title']} (Relevanz: {result['relevance']:.2%})")
        
        # Show document relationships
        print("\n🔗 Dokumentenbeziehungen:")
        for result in results:
            if result['integration'].cross_references_created:
                doc_id = result['integration'].doc_id
                graph = knowledge_mgr.get_document_graph(doc_id, depth=1)
                
                print(f"\n  {result['filename']}:")
                edges = graph.get('edges', [])
                for edge in edges[:5]:
                    source_title = graph['nodes'].get(edge['source'], {}).get('title', 'Unknown')
                    target_title = graph['nodes'].get(edge['target'], {}).get('title', 'Unknown')
                    print(f"    - {source_title} --[{edge['type']}]--> {target_title}")
        
        # Summary statistics
        print(f"\n\n{'='*60}")
        print("✨ Zusammenfassung")
        print(f"{'='*60}")
        
        total_docs = len(results)
        total_tables = sum(len(r['processed'].tables) for r in results)
        total_code = sum(len(r['processed'].code_snippets) for r in results)
        total_refs = sum(len(r['processed'].references) for r in results)
        total_cross_refs = sum(len(r['integration'].cross_references_created) for r in results)
        
        print(f"\n📊 Verarbeitungsstatistiken:")
        print(f"  - Dokumente verarbeitet: {total_docs}")
        print(f"  - Tabellen extrahiert: {total_tables}")
        print(f"  - Code-Snippets gefunden: {total_code}")
        print(f"  - Referenzen erkannt: {total_refs}")
        print(f"  - Querverweise erstellt: {total_cross_refs}")
        
        # Version management demo
        version_updates = [r for r in results if r['integration'].updates_applied]
        if version_updates:
            print(f"\n📝 Versionsverwaltung:")
            print(f"  - Versionsupdates erkannt: {len(version_updates)}")
            for update in version_updates:
                print(f"  - {update['filename']}: Neue Version integriert")
        
        print(f"\n🎯 Phase 2 erfolgreich abgeschlossen!")
        print(f"\nDie Wissensbasis enthält nun:")
        print(f"  ✅ Automatisch klassifizierte Dokumente")
        print(f"  ✅ Extrahierte strukturierte Inhalte")
        print(f"  ✅ Erkannte Duplikate und Versionen")
        print(f"  ✅ Verknüpfte Querverweise")
        print(f"  ✅ Durchsuchbare Wissensgraph-Struktur")
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    try:
        demonstrate_complete_workflow()
    except Exception as e:
        print(f"\n❌ Fehler: {str(e)}")
        import traceback
        traceback.print_exc()