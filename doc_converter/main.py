"""
Hauptmodul für die Dokumentenkonvertierungspipeline.
Steuert den gesamten Konvertierungsprozess von Dokumenten in Markdown.
"""

import os
import sys
import json
import time
import logging
import argparse
import concurrent.futures
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional, Set

# Importe für die Pipeline-Komponenten
from .inventory.document_classifier import DocumentClassifier
from .inventory.inventory_scanner import DocumentScanner
from .inventory.report_generator import ReportGenerator

from converters.base_converter import BaseConverter
from converters.pdf_converter import PDFConverter
from converters.docx_converter import DocxConverter
from converters.xlsx_converter import ExcelConverter
from converters.html_converter import HTMLConverter
from converters.pptx_converter import PowerPointConverter

from processing.cleaner import MarkdownCleaner
from processing.validator import MarkdownValidator
from processing.structure_fixer import StructureFixer
from processing.table_formatter import TableFormatter

from utils.file_utils import get_files_in_directory, is_file_supported, create_directory
from utils.config import ConfigManager


class DocConverter:
    """Hauptklasse für die Dokumentenkonvertierungspipeline"""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialisiert die Konvertierungspipeline.
        
        Args:
            config_path: Pfad zur Konfigurationsdatei
        """
        # Setup Logging
        self.logger = logging.getLogger(__name__)
        
        # Lade Konfiguration
        self.config = ConfigManager.load_config(config_path)
        
        # Verzeichnispfade
        self.source_dir = Path(self.config.get('source_dir', 'data/raw_docs'))
        self.target_dir = Path(self.config.get('target_dir', 'data/txt'))
        self.inventory_dir = Path(self.config.get('inventory_dir', 'doc_converter/data/inventory'))
        self.temp_dir = Path(self.config.get('temp_dir', 'doc_converter/data/temp'))
        
        # Stelle sicher, dass Verzeichnisse existieren
        self._ensure_directories()
        
        # Pipeline-Optionen
        self.parallel_processing = self.config.get('parallel_processing', True)
        self.max_workers = self.config.get('max_workers', 4)
        self.post_processing = self.config.get('post_processing', True)
        self.validate_results = self.config.get('validate_results', True)
        self.supported_extensions = self.config.get('supported_extensions', 
            ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.html', '.htm', '.md', '.txt'])
        
        # Initialisiere Komponenten
        self._init_components()
        
        # Converter-Mapping
        self.converters = {
            '.pdf': self.pdf_converter,
            '.docx': self.docx_converter,
            '.doc': self.docx_converter,
            '.xlsx': self.excel_converter,
            '.xls': self.excel_converter,
            '.pptx': self.pptx_converter,
            '.ppt': self.pptx_converter,
            '.html': self.html_converter,
            '.htm': self.html_converter,
            '.md': None,  # Markdown wird direkt kopiert
            '.txt': None  # Text wird direkt kopiert
        }
    
    def _ensure_directories(self) -> None:
        """Stellt sicher, dass alle erforderlichen Verzeichnisse existieren"""
        for directory in [self.source_dir, self.target_dir, self.inventory_dir, self.temp_dir]:
            create_directory(str(directory))
            self.logger.info(f"Verzeichnis sichergestellt: {directory}")
    
    def _init_components(self) -> None:
        """Initialisiert alle Pipeline-Komponenten"""
        # Inventory-Komponenten
        self.scanner = DocumentScanner(self.config)
        self.classifier = DocumentClassifier(self.config)
        self.report_generator = ReportGenerator(self.config)
        
        # Converter-Komponenten
        self.pdf_converter = PDFConverter(self.config)
        self.docx_converter = DocxConverter(self.config)
        self.excel_converter = ExcelConverter(self.config)
        self.html_converter = HTMLConverter(self.config)
        self.pptx_converter = PowerPointConverter(self.config)
        
        # Processing-Komponenten
        self.cleaner = MarkdownCleaner(self.config)
        self.validator = MarkdownValidator(self.config)
        self.structure_fixer = StructureFixer(self.config)
        self.table_formatter = TableFormatter(self.config)
    
    def inventory_directory(self) -> Dict[str, Any]:
        """
        Führt eine Inventarisierung des Quellverzeichnisses durch.
        
        Returns:
            Dictionary mit Informationen über die Inventarisierung
        """
        try:
            self.logger.info(f"Starte Inventarisierung von: {self.source_dir}")
            
            # Scanne das Verzeichnis
            inventory_df = self.scanner.scan_directory(self.source_dir)
            
            if inventory_df.empty:
                self.logger.warning(f"Keine Dokumente in {self.source_dir} gefunden")
                return {
                    'success': False,
                    'message': f"Keine Dokumente in {self.source_dir} gefunden",
                    'document_count': 0
                }
            
            # Klassifiziere die Dokumente
            classified_df = self.classifier.classify_documents(inventory_df)
            
            # Speichere die Inventardaten
            inventory_file = self.inventory_dir / "document_inventory.csv"
            classified_file = self.inventory_dir / "classified_documents.csv"
            
            inventory_df.to_csv(inventory_file, index=False)
            classified_df.to_csv(classified_file, index=False)
            
            # Generiere Bericht
            report_dir = self.report_generator.generate_inventory_report(classified_df)
            
            return {
                'success': True,
                'document_count': len(classified_df),
                'inventory_file': str(inventory_file),
                'classified_file': str(classified_file),
                'report_dir': report_dir,
                'document_types': classified_df['document_category'].value_counts().to_dict(),
                'priority_groups': classified_df['priority_group'].value_counts().to_dict()
            }
        
        except Exception as e:
            self.logger.error(f"Fehler bei der Inventarisierung: {e}", exc_info=True)
            return {
                'success': False,
                'message': f"Fehler bei der Inventarisierung: {str(e)}",
                'document_count': 0
            }
    
    def convert_all(self, priority_group: Optional[str] = None) -> Dict[str, Any]:
        """
        Konvertiert alle Dokumente im Quellverzeichnis.
        
        Args:
            priority_group: Optional, konvertiert nur Dokumente einer bestimmten Prioritätsgruppe
            
        Returns:
            Dictionary mit Informationen über die Konvertierung
        """
        try:
            self.logger.info(f"Starte Konvertierung aller Dokumente aus: {self.source_dir}")
            
            # Lade klassifizierte Dokumente, falls vorhanden
            classified_file = self.inventory_dir / "classified_documents.csv"
            
            if classified_file.exists():
                import pandas as pd
                classified_df = pd.read_csv(classified_file)
                
                # Filtere nach Prioritätsgruppe, falls angegeben
                if priority_group:
                    self.logger.info(f"Filtere nach Prioritätsgruppe: {priority_group}")
                    classified_df = classified_df[classified_df['priority_group'] == priority_group]
                
                if classified_df.empty:
                    self.logger.warning(f"Keine Dokumente mit Prioritätsgruppe {priority_group} gefunden")
                    return {
                        'success': False,
                        'message': f"Keine Dokumente mit Prioritätsgruppe {priority_group} gefunden",
                        'converted': 0,
                        'failed': 0
                    }
                
                # Konvertiere Dokumente basierend auf der Klassifizierung
                self.logger.info(f"Konvertiere {len(classified_df)} klassifizierte Dokumente")
                
                # Gruppiere nach Priorität für sequenzielle Verarbeitung nach Priorität
                priority_groups = classified_df.groupby('priority_group')
                
                results = {
                    'success': True,
                    'converted': 0,
                    'failed': 0,
                    'details': []
                }
                
                for group_name, group_df in priority_groups:
                    group_results = self._convert_group(group_df)
                    
                    results['converted'] += group_results['converted']
                    results['failed'] += group_results['failed']
                    results['details'].extend(group_results['details'])
                
                return results
            
            else:
                # Keine Klassifizierung gefunden, konvertiere alle Dateien im Verzeichnis
                self.logger.info("Keine Klassifizierungsdaten gefunden, konvertiere alle Dateien im Verzeichnis")
                
                files = get_files_in_directory(str(self.source_dir), recursive=True, 
                                            supported_extensions=self.supported_extensions)
                
                return self._convert_files(files)
        
        except Exception as e:
            self.logger.error(f"Fehler bei der Konvertierung aller Dokumente: {e}", exc_info=True)
            return {
                'success': False,
                'message': f"Fehler bei der Konvertierung aller Dokumente: {str(e)}",
                'converted': 0,
                'failed': 0
            }
    
    def _convert_group(self, group_df) -> Dict[str, Any]:
        """
        Konvertiert eine Gruppe von Dokumenten basierend auf einem DataFrame.
        
        Args:
            group_df: DataFrame mit zu konvertierenden Dokumenten
            
        Returns:
            Dictionary mit Informationen über die Konvertierung
        """
        # Extrahiere Pfade aus dem DataFrame
        files = [Path(row['path']) for _, row in group_df.iterrows()]
        
        # Konvertiere Dateien
        return self._convert_files(files)
    
    def _convert_files(self, files: List[Path]) -> Dict[str, Any]:
        """
        Konvertiert eine Liste von Dateien.
        
        Args:
            files: Liste von Dateipfaden
            
        Returns:
            Dictionary mit Informationen über die Konvertierung
        """
        if not files:
            return {
                'success': True,
                'converted': 0,
                'failed': 0,
                'details': []
            }
        
        self.logger.info(f"Konvertiere {len(files)} Dateien")
        
        results = {
            'success': True,
            'converted': 0,
            'failed': 0,
            'details': []
        }
        
        if self.parallel_processing and len(files) > 1:
            # Parallele Verarbeitung
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                # Erstelle Future-Objekte für jede Datei
                future_to_file = {
                    executor.submit(self.convert_document, file): file 
                    for file in files
                }
                
                # Verarbeite die Ergebnisse
                for future in concurrent.futures.as_completed(future_to_file):
                    file = future_to_file[future]
                    try:
                        result = future.result()
                        if result['success']:
                            results['converted'] += 1
                        else:
                            results['failed'] += 1
                        
                        results['details'].append(result)
                    
                    except Exception as e:
                        self.logger.error(f"Fehler bei der Konvertierung von {file}: {e}", exc_info=True)
                        results['failed'] += 1
                        results['details'].append({
                            'success': False,
                            'source': str(file),
                            'error': str(e)
                        })
        else:
            # Sequentielle Verarbeitung
            for file in files:
                try:
                    result = self.convert_document(file)
                    if result['success']:
                        results['converted'] += 1
                    else:
                        results['failed'] += 1
                    
                    results['details'].append(result)
                
                except Exception as e:
                    self.logger.error(f"Fehler bei der Konvertierung von {file}: {e}", exc_info=True)
                    results['failed'] += 1
                    results['details'].append({
                        'success': False,
                        'source': str(file),
                        'error': str(e)
                    })
        
        return results
    
    def convert_document(self, source_path: Path) -> Dict[str, Any]:
        """
        Konvertiert ein einzelnes Dokument.
        
        Args:
            source_path: Pfad zur Quelldatei
            
        Returns:
            Dictionary mit Informationen über die Konvertierung
        """
        try:
            self.logger.info(f"Konvertiere Dokument: {source_path}")
            
            # Überprüfe, ob die Datei unterstützt wird
            if not is_file_supported(source_path, self.supported_extensions):
                self.logger.warning(f"Nicht unterstütztes Dateiformat: {source_path}")
                return {
                    'success': False,
                    'source': str(source_path),
                    'error': f"Nicht unterstütztes Dateiformat: {source_path.suffix}"
                }
            
            # Bestimme Zieldateiname
            rel_path = source_path.relative_to(self.source_dir) if source_path.is_relative_to(self.source_dir) else source_path.name
            target_path = self.target_dir / f"{rel_path.stem}.md"
            
            # Erstelle Zielverzeichnis
            target_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Bestimme den Converter basierend auf der Dateierweiterung
            converter = self.converters.get(source_path.suffix.lower())
            
            # Wenn kein Converter verfügbar ist, aber die Datei unterstützt wird (z.B. MD, TXT)
            if converter is None:
                if source_path.suffix.lower() in ['.md', '.txt']:
                    # Kopiere Datei direkt (mit optionaler Verarbeitung)
                    import shutil
                    
                    if self.post_processing and source_path.suffix.lower() == '.md':
                        # Bei Markdown-Dateien: Verbessere Struktur und reinige
                        try:
                            # Zuerst Struktur verbessern
                            structure_result = self.structure_fixer.improve_structure(source_path, target_path)
                            
                            # Dann bereinigen
                            clean_result = self.cleaner.clean(target_path)
                            
                            # Optional: Validieren
                            if self.validate_results:
                                validation = self.validator.validate(target_path)
                                
                                return {
                                    'success': True,
                                    'source': str(source_path),
                                    'target': str(target_path),
                                    'validation': validation,
                                    'changes': structure_result.get('changes', []) + clean_result.get('changes', [])
                                }
                            
                            return {
                                'success': True,
                                'source': str(source_path),
                                'target': str(target_path),
                                'changes': structure_result.get('changes', []) + clean_result.get('changes', [])
                            }
                        
                        except Exception as e:
                            self.logger.error(f"Fehler bei der Verarbeitung von {source_path}: {e}")
                            # Fallback: Direkte Kopie
                            shutil.copy2(source_path, target_path)
                    else:
                        # Bei anderen Dateien: Einfach kopieren
                        shutil.copy2(source_path, target_path)
                    
                    return {
                        'success': True,
                        'source': str(source_path),
                        'target': str(target_path),
                        'changes': ['Datei direkt kopiert']
                    }
                else:
                    return {
                        'success': False,
                        'source': str(source_path),
                        'error': f"Kein Converter für Dateityp {source_path.suffix} verfügbar"
                    }
            
            # Konvertiere das Dokument
            convert_result = converter.convert(source_path, target_path.parent)
            
            # Wenn die Konvertierung erfolgreich war und Nachbearbeitung aktiviert ist
            if convert_result.get('success', False) and self.post_processing:
                try:
                    # Hole den Pfad zur konvertierten Datei
                    md_path = Path(convert_result.get('target', ''))
                    
                    if md_path.exists():
                        # Verbessere die Struktur
                        structure_result = self.structure_fixer.improve_structure(md_path)
                        
                        # Bereinige das Markdown
                        clean_result = self.cleaner.clean(md_path)
                        
                        # Formatiere Tabellen
                        table_result = self.table_formatter.format_tables(md_path)
                        
                        # Füge Änderungen hinzu
                        if 'changes' not in convert_result:
                            convert_result['changes'] = []
                        
                        convert_result['changes'].extend(structure_result.get('changes', []))
                        convert_result['changes'].extend(clean_result.get('changes', []))
                        convert_result['changes'].extend(table_result.get('changes', []))
                        
                        # Optional: Validiere das Ergebnis
                        if self.validate_results:
                            validation = self.validator.validate(md_path)
                            convert_result['validation'] = validation
                
                except Exception as e:
                    self.logger.error(f"Fehler bei der Nachbearbeitung von {source_path}: {e}")
                    # Füge Fehlerinformation hinzu, aber Konvertierung bleibt erfolgreich
                    if 'changes' not in convert_result:
                        convert_result['changes'] = []
                    
                    convert_result['changes'].append(f"Fehler bei der Nachbearbeitung: {str(e)}")
            
            return convert_result
            
        except Exception as e:
            self.logger.error(f"Fehler bei der Konvertierung von {source_path}: {e}", exc_info=True)
            return {
                'success': False,
                'source': str(source_path),
                'error': str(e)
            }
    
    def validate_markdown(self, markdown_path: Path) -> Dict[str, Any]:
        """
        Validiert eine Markdown-Datei.
        
        Args:
            markdown_path: Pfad zur Markdown-Datei
            
        Returns:
            Dictionary mit Validierungsergebnissen
        """
        try:
            self.logger.info(f"Validiere Markdown-Datei: {markdown_path}")
            
            if not markdown_path.exists():
                return {
                    'success': False,
                    'error': f"Datei existiert nicht: {markdown_path}"
                }
            
            # Validiere die Markdown-Datei
            validation = self.validator.validate(markdown_path)
            
            return {
                'success': True,
                'path': str(markdown_path),
                'validation': validation
            }
        
        except Exception as e:
            self.logger.error(f"Fehler bei der Validierung von {markdown_path}: {e}", exc_info=True)
            return {
                'success': False,
                'path': str(markdown_path),
                'error': str(e)
            }
    
    def clean_markdown(self, markdown_path: Path, output_path: Optional[Path] = None) -> Dict[str, Any]:
        """
        Bereinigt eine Markdown-Datei.
        
        Args:
            markdown_path: Pfad zur Markdown-Datei
            output_path: Optionaler Ausgabepfad (wenn None, wird die Originaldatei überschrieben)
            
        Returns:
            Dictionary mit Bereinigungsergebnissen
        """
        try:
            self.logger.info(f"Bereinige Markdown-Datei: {markdown_path}")
            
            if not markdown_path.exists():
                return {
                    'success': False,
                    'error': f"Datei existiert nicht: {markdown_path}"
                }
            
            # Bereinige die Markdown-Datei
            result = self.cleaner.clean(markdown_path, output_path)
            
            return result
        
        except Exception as e:
            self.logger.error(f"Fehler bei der Bereinigung von {markdown_path}: {e}", exc_info=True)
            return {
                'success': False,
                'source': str(markdown_path),
                'error': str(e)
            }
    
    def improve_structure(self, markdown_path: Path, output_path: Optional[Path] = None) -> Dict[str, Any]:
        """
        Verbessert die Struktur einer Markdown-Datei.
        
        Args:
            markdown_path: Pfad zur Markdown-Datei
            output_path: Optionaler Ausgabepfad (wenn None, wird die Originaldatei überschrieben)
            
        Returns:
            Dictionary mit Strukturverbesserungsergebnissen
        """
        try:
            self.logger.info(f"Verbessere Struktur der Markdown-Datei: {markdown_path}")
            
            if not markdown_path.exists():
                return {
                    'success': False,
                    'error': f"Datei existiert nicht: {markdown_path}"
                }
            
            # Verbessere die Struktur der Markdown-Datei
            result = self.structure_fixer.improve_structure(markdown_path, output_path)
            
            return result
        
        except Exception as e:
            self.logger.error(f"Fehler bei der Strukturverbesserung von {markdown_path}: {e}", exc_info=True)
            return {
                'success': False,
                'source': str(markdown_path),
                'error': str(e)
            }
    
    def format_tables(self, markdown_path: Path, output_path: Optional[Path] = None) -> Dict[str, Any]:
        """
        Formatiert Tabellen in einer Markdown-Datei.
        
        Args:
            markdown_path: Pfad zur Markdown-Datei
            output_path: Optionaler Ausgabepfad (wenn None, wird die Originaldatei überschrieben)
            
        Returns:
            Dictionary mit Tabellenformatierungsergebnissen
        """
        try:
            self.logger.info(f"Formatiere Tabellen in Markdown-Datei: {markdown_path}")
            
            if not markdown_path.exists():
                return {
                    'success': False,
                    'error': f"Datei existiert nicht: {markdown_path}"
                }
            
            # Formatiere die Tabellen in der Markdown-Datei
            result = self.table_formatter.format_tables(markdown_path, output_path)
            
            return result
        
        except Exception as e:
            self.logger.error(f"Fehler bei der Tabellenformatierung von {markdown_path}: {e}", exc_info=True)
            return {
                'success': False,
                'source': str(markdown_path),
                'error': str(e)
            }
    
    def process_markdown_directory(self, markdown_dir: Path) -> Dict[str, Any]:
        """
        Verarbeitet alle Markdown-Dateien in einem Verzeichnis (Reinigung, Strukturverbesserung, Tabellenformatierung).
        
        Args:
            markdown_dir: Pfad zum Markdown-Verzeichnis
            
        Returns:
            Dictionary mit Verarbeitungsergebnissen
        """
        try:
            self.logger.info(f"Verarbeite Markdown-Dateien in Verzeichnis: {markdown_dir}")
            
            if not markdown_dir.exists() or not markdown_dir.is_dir():
                return {
                    'success': False,
                    'error': f"Verzeichnis existiert nicht oder ist kein Verzeichnis: {markdown_dir}"
                }
            
            # Finde alle Markdown-Dateien im Verzeichnis
            markdown_files = list(markdown_dir.glob('**/*.md'))
            
            if not markdown_files:
                return {
                    'success': True,
                    'message': f"Keine Markdown-Dateien in {markdown_dir} gefunden",
                    'processed': 0
                }
            
            results = {
                'success': True,
                'processed': 0,
                'failed': 0,
                'details': []
            }
            
            # Verarbeite jede Markdown-Datei
            for md_file in markdown_files:
                try:
                    # Führe alle Verarbeitungsschritte nacheinander aus
                    structure_result = self.improve_structure(md_file)
                    clean_result = self.clean_markdown(md_file)
                    table_result = self.format_tables(md_file)
                    
                    # Überprüfe, ob alle Schritte erfolgreich waren
                    if (structure_result.get('success', False) and 
                        clean_result.get('success', False) and 
                        table_result.get('success', False)):
                        
                        results['processed'] += 1
                        results['details'].append({
                            'success': True,
                            'path': str(md_file),
                            'changes': (
                                structure_result.get('changes', []) + 
                                clean_result.get('changes', []) + 
                                table_result.get('changes', [])
                            )
                        })
                    else:
                        results['failed'] += 1
                        results['details'].append({
                            'success': False,
                            'path': str(md_file),
                            'error': "Mindestens ein Verarbeitungsschritt ist fehlgeschlagen"
                        })
                
                except Exception as e:
                    self.logger.error(f"Fehler bei der Verarbeitung von {md_file}: {e}", exc_info=True)
                    results['failed'] += 1
                    results['details'].append({
                        'success': False,
                        'path': str(md_file),
                        'error': str(e)
                    })
            
            return results
        
        except Exception as e:
            self.logger.error(f"Fehler bei der Verarbeitung des Verzeichnisses {markdown_dir}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'processed': 0,
                'failed': 0
            }


def parse_args():
    """Parst die Kommandozeilenargumente"""
    parser = argparse.ArgumentParser(description='Dokumentenkonvertierungs-Pipeline')
    
    # Unterbefehle
    subparsers = parser.add_subparsers(dest='command', help='Befehl')
    
    # Inventar-Befehl
    inventory_parser = subparsers.add_parser('inventory', help='Inventarisiert Dokumente')
    inventory_parser.add_argument('--source-dir', type=str, help='Quellverzeichnis')
    
    # Konvertieren-Befehl
    convert_parser = subparsers.add_parser('convert', help='Konvertiert Dokumente')
    convert_parser.add_argument('--source-dir', type=str, help='Quellverzeichnis')
    convert_parser.add_argument('--target-dir', type=str, help='Zielverzeichnis')
    convert_parser.add_argument('--priority', type=str, help='Prioritätsgruppe (z.B. "Gruppe 1 (Hohe Priorität)")')
    convert_parser.add_argument('--parallel', action='store_true', help='Aktiviert parallele Verarbeitung')
    convert_parser.add_argument('--workers', type=int, default=4, help='Anzahl der Worker für parallele Verarbeitung')
    
    # Einzelne Datei konvertieren
    file_parser = subparsers.add_parser('convert-file', help='Konvertiert eine einzelne Datei')
    file_parser.add_argument('file', type=str, help='Zu konvertierende Datei')
    file_parser.add_argument('--target-dir', type=str, help='Zielverzeichnis')
    
    # Markdown-Verarbeitung
    md_parser = subparsers.add_parser('process-markdown', help='Verarbeitet Markdown-Dateien')
    md_parser.add_argument('--dir', type=str, help='Markdown-Verzeichnis')
    
    # Konfiguration
    parser.add_argument('--config', type=str, help='Pfad zur Konfigurationsdatei')
    parser.add_argument('--verbose', action='store_true', help='Ausführliche Ausgabe')
    
    return parser.parse_args()


def setup_logging(verbose: bool = False):
    """Richtet das Logging ein"""
    log_level = logging.DEBUG if verbose else logging.INFO
    
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('doc_converter.log')
        ]
    )


def main():
    """Hauptfunktion"""
    # Parse Argumente
    args = parse_args()
    
    # Setup Logging
    setup_logging(args.verbose)
    
    # Initialisiere Konverter
    converter = DocConverter(args.config)
    
    # Verarbeite Kommando
    if args.command == 'inventory':
        # Setze Quellverzeichnis, falls angegeben
        if args.source_dir:
            converter.source_dir = Path(args.source_dir)
        
        # Führe Inventarisierung durch
        result = converter.inventory_directory()
        
        # Gib Ergebnis aus
        if result['success']:
            print(f"Inventarisierung erfolgreich abgeschlossen. {result['document_count']} Dokumente gefunden.")
            print(f"Inventarbericht: {result.get('report_dir', '')}")
            
            # Gib weitere Details aus
            for doc_type, count in result.get('document_types', {}).items():
                print(f"  - {doc_type}: {count} Dokumente")
            
            print("\nPrioritätsgruppen:")
            for group, count in result.get('priority_groups', {}).items():
                print(f"  - {group}: {count} Dokumente")
        else:
            print(f"Fehler bei der Inventarisierung: {result.get('message', 'Unbekannter Fehler')}")
    
    elif args.command == 'convert':
        # Setze Verzeichnisse, falls angegeben
        if args.source_dir:
            converter.source_dir = Path(args.source_dir)
        
        if args.target_dir:
            converter.target_dir = Path(args.target_dir)
        
        # Setze Parallel-Verarbeitung, falls angegeben
        if args.parallel is not None:
            converter.parallel_processing = args.parallel
        
        if args.workers:
            converter.max_workers = args.workers
        
        # Führe Konvertierung durch
        result = converter.convert_all(args.priority)
        
        # Gib Ergebnis aus
        if result['success']:
            print(f"Konvertierung abgeschlossen. {result['converted']} Dokumente erfolgreich konvertiert, {result['failed']} fehlgeschlagen.")
            
            if result['failed'] > 0:
                print("\nFehlgeschlagene Dokumente:")
                for detail in result.get('details', []):
                    if not detail.get('success', False):
                        print(f"  - {detail.get('source', '')}: {detail.get('error', 'Unbekannter Fehler')}")
        else:
            print(f"Fehler bei der Konvertierung: {result.get('message', 'Unbekannter Fehler')}")
    
    elif args.command == 'convert-file':
        # Setze Zielverzeichnis, falls angegeben
        if args.target_dir:
            converter.target_dir = Path(args.target_dir)
        
        # Konvertiere einzelne Datei
        file_path = Path(args.file)
        result = converter.convert_document(file_path)
        
        # Gib Ergebnis aus
        if result['success']:
            print(f"Datei erfolgreich konvertiert: {result.get('source', '')} -> {result.get('target', '')}")
            
            if 'changes' in result and result['changes']:
                print("\nDurchgeführte Änderungen:")
                for change in result['changes']:
                    print(f"  - {change}")
            
            if 'validation' in result:
                validation = result['validation']
                if validation.get('is_valid', False):
                    print("\nValidierung: Erfolgreich")
                else:
                    print("\nValidierung: Fehler gefunden")
                    if 'issues' in validation and validation['issues']:
                        print("  Probleme:")
                        for issue in validation['issues']:
                            print(f"    - {issue}")
                    
                    if 'warnings' in validation and validation['warnings']:
                        print("  Warnungen:")
                        for warning in validation['warnings']:
                            print(f"    - {warning}")
        else:
            print(f"Fehler bei der Konvertierung: {result.get('error', 'Unbekannter Fehler')}")
    
    elif args.command == 'process-markdown':
        # Setze Markdown-Verzeichnis, falls angegeben
        md_dir = Path(args.dir) if args.dir else converter.target_dir
        
        # Verarbeite Markdown-Dateien
        result = converter.process_markdown_directory(md_dir)
        
        # Gib Ergebnis aus
        if result['success']:
            print(f"Verarbeitung abgeschlossen. {result['processed']} Dateien erfolgreich verarbeitet, {result['failed']} fehlgeschlagen.")
            
            if result['failed'] > 0:
                print("\nFehlgeschlagene Dateien:")
                for detail in result.get('details', []):
                    if not detail.get('success', False):
                        print(f"  - {detail.get('path', '')}: {detail.get('error', 'Unbekannter Fehler')}")
        else:
            print(f"Fehler bei der Verarbeitung: {result.get('error', 'Unbekannter Fehler')}")
    
    else:
        print("Kein gültiger Befehl angegeben. Verwende --help für Hilfe.")


if __name__ == "__main__":
    main()