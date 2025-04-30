import pickle
import re
import hashlib
import threading
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple, Set

from ..core.config import Config
from ..core.logging import LogManager
from doc_converter.main import DocConverter

logger = LogManager.setup_logging(__name__)

class Document:
    """Repräsentiert ein einzelnes Dokument"""

    def __init__(self, text: str, filename: str, metadata: Optional[Dict[str, Any]] = None):
        self.text = text
        self.filename = filename
        self.metadata = metadata or {}
        self.chunks = []

    def process(self):
        """Verarbeitet das Dokument in Chunks"""
        self.chunks = []

        # Versuche strukturierte Abschnitte zu erkennen
        sections = self._extract_sections()

        if sections:
            for section in sections:
                # Ignoriere sehr kleine Abschnitte (< 50 Zeichen)
                if len(section['text']) > 50:
                    self.chunks.append({
                        'text': section['text'],
                        'file': self.filename,
                        'title': section['title'],
                        'type': 'section'
                    })
        else:
            # Neue Variante: Chunking nach ca. 800 Zeichen, satzbasiert
            chunked = self._chunk_text_by_sentences(self.text, max_chars=800)
            logger.info(f"📏 Generierte {len(chunked)} Chunks mit Zeichenlängen:")
            for i, c in enumerate(chunked[:10]):
                logger.info(f"Chunk {i+1}: {len(c)} Zeichen - Vorschau: {c[:80]}...")

            for chunk_text in chunked:
                if len(chunk_text) > 1500:
                    logger.warning(f"⚠️ Ignoriere Chunk mit {len(chunk_text)} Zeichen (zu lang)")
                    continue
                if len(chunk_text) > 50:
                    self.chunks.append({
                        'text': chunk_text,
                        'file': self.filename,
                        'type': 'chunk'
                    })

            logger.info(f"📄 {self.filename} → {len(self.chunks)} Chunks insgesamt verarbeitet")

            # Alte Fallback-Logik (überlappende Chunks) — deaktiviert, aber erhalten
            # chunk_size = Config.CHUNK_SIZE
            # overlap = Config.CHUNK_OVERLAP
            # if overlap >= chunk_size:
            #     overlap = chunk_size // 2
            #     logger.warning(f"Überlappung zu groß, reduziert auf {overlap}")
            # step_size = chunk_size - overlap
            # text_length = len(self.text)
            # for i in range(0, text_length, step_size):
            #     end_pos = min(i + chunk_size, text_length)
            #     chunk_text = self._preprocess_text(self.text[i:end_pos])
            #     if len(chunk_text) > 50:
            #         self.chunks.append({
            #             'text': chunk_text,
            #             'file': self.filename,
            #             'start': i,
            #             'type': 'chunk'
            #         })

    def _chunk_text_by_sentences(self, text: str, max_chars: int = 800) -> List[str]:
        """Teilt Text an Satzgrenzen in ca. max_chars lange Chunks"""
        sentences = re.split(r'(?<=[.!?]) +', text)
        chunks = []
        current_chunk = ""

        for sentence in sentences:
            if len(current_chunk) + len(sentence) + 1 > max_chars:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = sentence
                else:
                    chunks.append(sentence.strip())
                    current_chunk = ""
            else:
                current_chunk += " " + sentence

        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        return chunks

    def _extract_sections(self) -> List[Dict[str, str]]:
        """Extrahiert strukturierte Abschnitte aus dem Text"""
        sections = []
        pattern = r'(?m)^(#{1,3}|[A-Z][A-Z\s]+:|[0-9]+\.[0-9.]*\s+)(.+?)$'
        headers = list(re.finditer(pattern, self.text))
        if len(headers) < 2:
            return []
        last_pos = 0
        last_header = "Einleitung"
        for match in headers:
            if last_pos > 0:
                section_text = self._preprocess_text(self.text[last_pos:match.start()])
                if section_text:
                    sections.append({
                        'title': last_header,
                        'text': section_text,
                        'type': 'section'
                    })
            last_header = match.group(2).strip()
            last_pos = match.end()
        if last_pos < len(self.text):
            sections.append({
                'title': last_header,
                'text': self._preprocess_text(self.text[last_pos:]),
                'type': 'section'
            })
        return sections

    def _preprocess_text(self, text: str) -> str:
        """Bereinigt Text für bessere Verarbeitung"""
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[\x00-\x1F\x7F]', '', text)
        return text.strip()

class DocumentStore:
    """Verwaltet die Dokument-Kollektion und Chunking"""
    
    def __init__(self):
        self.documents = {}
        self.chunks = []
        self.doc_modified = {}
        self.lock = threading.RLock()

    # Neu: Initialisieren des Dokumentenkonverters
        try:
            self.doc_converter = DocConverter()
            self.logger.info("Dokumentenkonverter erfolgreich initialisiert")
        except Exception as e:
            self.logger.error(f"Fehler beim Initialisieren des Dokumentenkonverters: {e}", exc_info=True)
            self.doc_converter = None

    def load_documents(self) -> bool:
        """Lädt alle Dokumente aus dem Dateisystem"""
        with self.lock:
            try:
                # Prüfe ob Cache existiert und aktuell ist
                if self._is_cache_valid():
                    logger.info("Verwende gecachte Dokumente")
                    return True
                
                logger.info("Lade Dokumente neu")
                self.documents = {}
                self.chunks = []
                self.doc_modified = {}
                
                # Lade alle Textdateien
                files_loaded = 0
                txt_dir = Config.TXT_DIR
                
                # Stelle sicher, dass das Verzeichnis existiert
                if not txt_dir.exists():
                    logger.warning(f"Textverzeichnis {txt_dir} existiert nicht, wird erstellt")
                    txt_dir.mkdir(parents=True, exist_ok=True)
                    return True  # Kein Fehler, aber keine Dokumente
                
                for file_path in txt_dir.glob('*'):
                    if file_path.suffix.lower() not in ['.txt', '.md']:
                        continue
                    try:
                        # Überspringe zu große Dateien
                        file_size = file_path.stat().st_size
                        if file_size > 10 * 1024 * 1024:  # 10 MB
                            logger.warning(f"Datei zu groß, wird übersprungen: {file_path.name} ({file_size/1024/1024:.2f} MB)")
                            continue
                            
                        with open(file_path, 'r', encoding='utf-8') as f:
                            text = f.read()
                        
                        # Speichere Änderungsdatum
                        modified_time = datetime.fromtimestamp(file_path.stat().st_mtime).strftime('%Y-%m-%d %H:%M')
                        self.doc_modified[file_path.name] = modified_time
                        
                        # Erstelle Dokument-Objekt
                        doc = Document(
                            text=text,
                            filename=file_path.name,
                            metadata={
                                'size': file_size,
                                'modified': modified_time,
                                'path': str(file_path)
                            }
                        )
                        
                        # Verarbeite Dokument
                        doc.process()
                        
                        # Speichere Dokument und füge Chunks hinzu
                        self.documents[file_path.name] = doc
                        self.chunks.extend(doc.chunks)
                        files_loaded += 1
                    
                    except Exception as e:
                        logger.error(f"Fehler beim Laden von {file_path}: {e}")
                
                logger.info(f"Insgesamt {files_loaded} Dokumente mit {len(self.chunks)} Chunks geladen")
                
                # Speichere Cache
                self._save_cache()
                return True
            
            except Exception as e:
                logger.error(f"Fehler beim Laden der Dokumente: {e}")
                return False
    
    def _is_cache_valid(self) -> bool:
        """Prüft ob der Cache aktuell ist"""
        cache_path = Config.CACHE_DIR / 'documents.pkl'
        
        if not cache_path.exists():
            return False
        
        try:
            # Prüfe Cache-Integrität
            with open(cache_path, 'rb') as f:
                cached_data = pickle.load(f)
            
            # Prüfe ob erwartete Daten vorhanden sind
            if not all(key in cached_data for key in ['documents', 'chunks', 'doc_modified']):
                logger.warning("Cache unvollständig, wird neu erstellt")
                return False
                
            cached_files = set(cached_data['doc_modified'].keys())
            
            # Prüfe ob TXT_DIR existiert
            if not Config.TXT_DIR.exists():
                logger.warning(f"Textverzeichnis {Config.TXT_DIR} existiert nicht")
                return False
                
            current_files = {f.name for f in Config.TXT_DIR.glob('*') if f.suffix.lower() in ['.txt', '.md']}

            
            # Prüfe ob alle Dateien übereinstimmen
            if cached_files != current_files:
                logger.info(f"Dateiunterschiede erkannt: Cache hat {len(cached_files)}, aktuell {len(current_files)}")
                return False
            
            # Prüfe ob Änderungsdaten übereinstimmen
            for file in current_files:
                file_path = Config.TXT_DIR / file
                modified_time = datetime.fromtimestamp(file_path.stat().st_mtime).strftime('%Y-%m-%d %H:%M')
                
                if modified_time != cached_data['doc_modified'].get(file):
                    logger.info(f"Änderungsdatum für {file} hat sich geändert")
                    return False
            
            # Lade Daten aus Cache
            self.documents = cached_data['documents']
            self.chunks = cached_data['chunks']
            self.doc_modified = cached_data['doc_modified']
            
            logger.info(f"Cache-Daten geladen: {len(self.documents)} Dokumente, {len(self.chunks)} Chunks")
            return True
        
        except Exception as e:
            logger.error(f"Fehler beim Prüfen des Cache: {e}")
            return False
    
    def _save_cache(self):
        """Speichert Dokumentenkollektion im Cache"""
        cache_path = Config.CACHE_DIR / 'documents.pkl'
        
        try:
            # Stelle sicher, dass das Verzeichnis existiert
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(cache_path, 'wb') as f:
                pickle.dump({
                    'documents': self.documents,
                    'chunks': self.chunks,
                    'doc_modified': self.doc_modified
                }, f)
            
            logger.info(f"Dokumente in Cache gespeichert: {len(self.documents)} Dokumente, {len(self.chunks)} Chunks")
        
        except Exception as e:
            logger.error(f"Fehler beim Speichern des Cache: {e}")
    
    def get_chunks(self) -> List[Dict[str, Any]]:
        """Gibt alle Chunks zurück"""
        with self.lock:
            return self.chunks
    
    def get_document_stats(self) -> Dict[str, Any]:
        """Gibt Statistiken zu den Dokumenten zurück"""
        with self.lock:
            stats = {
                'document_count': len(self.documents),
                'chunk_count': len(self.chunks),
                'documents': {}
            }
            
            for filename, doc in self.documents.items():
                doc_chunks = [c for c in self.chunks if c['file'] == filename]
                stats['documents'][filename] = {
                    'size': doc.metadata.get('size', 0),
                    'modified': doc.metadata.get('modified', ''),
                    'chunks': len(doc_chunks),
                    'total_tokens': sum(len(c['text'].split()) for c in doc_chunks)
                }
            
            return stats
    
    def convert_document(self, source_path: str, target_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Konvertiert ein einzelnes Dokument ins Markdown-Format.
        
        Args:
            source_path: Pfad zum Quelldokument
            target_dir: Optionaler Zielordner (wenn nicht angegeben, wird Config.TXT_DIR verwendet)
            
        Returns:
            Dictionary mit Konvertierungsergebnis
        """
        if self.doc_converter is None:
            return {
                'success': False,
                'error': "Dokumentenkonverter nicht initialisiert",
                'source': source_path
            }
        
        try:
            # Zielverzeichnis festlegen
            if target_dir is None:
                from modules.core.config import Config
                target_dir = Config.TXT_DIR
            
            # Konvertierung durchführen
            result = self.doc_converter.convert_document(Path(source_path), Path(target_dir))
            
            # Wenn Konvertierung erfolgreich, Dokument neu laden
            if result.get('success', False):
                # Bereite asynchrones Neuladen der Dokumente vor
                self.logger.info(f"Dokument erfolgreich konvertiert: {result.get('target')}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Fehler bei der Konvertierung von {source_path}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'source': source_path
            }
    
    def convert_and_load_documents(self, source_dir: str, target_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Konvertiert alle unterstützten Dokumente in einem Verzeichnis und lädt sie in den Store.
        
        Args:
            source_dir: Pfad zum Quellverzeichnis
            target_dir: Optionaler Zielordner (wenn nicht angegeben, wird Config.TXT_DIR verwendet)
            
        Returns:
            Dictionary mit Konvertierungsergebnis
        """
        if self.doc_converter is None:
            return {
                'success': False,
                'error': "Dokumentenkonverter nicht initialisiert",
                'converted': 0,
                'failed': 0
            }
        
        try:
            # Zielverzeichnis festlegen
            if target_dir is None:
                from modules.core.config import Config
                target_dir = Config.TXT_DIR
            
            # Führe Konvertierung durch
            result = self.doc_converter.convert_all(priority_group=None)
            
            if result.get('success', False):
                # Nach erfolgreicher Konvertierung Dokumente neu laden
                self.logger.info(f"Konvertierung abgeschlossen: {result.get('converted', 0)} Dokumente konvertiert")
                
                # Lade Dokumente neu
                self.load_documents()
            
            return result
            
        except Exception as e:
            self.logger.error(f"Fehler bei der Konvertierung von Dokumenten aus {source_dir}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'converted': 0,
                'failed': 0
            }
    
    def inventory_documents(self, source_dir: str) -> Dict[str, Any]:
        """
        Führt eine Inventarisierung der Dokumente durch.
        
        Args:
            source_dir: Pfad zum Quellverzeichnis
            
        Returns:
            Dictionary mit Inventarergebnis
        """
        if self.doc_converter is None:
            return {
                'success': False,
                'error': "Dokumentenkonverter nicht initialisiert",
                'document_count': 0
            }
        
        try:
            # Setze Quellverzeichnis im Konverter
            original_source_dir = self.doc_converter.source_dir
            self.doc_converter.source_dir = Path(source_dir)
            
            # Führe Inventarisierung durch
            result = self.doc_converter.inventory_directory()
            
            # Stelle ursprüngliches Quellverzeichnis wieder her
            self.doc_converter.source_dir = original_source_dir
            
            return result
            
        except Exception as e:
            self.logger.error(f"Fehler bei der Inventarisierung von Dokumenten in {source_dir}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'document_count': 0
            }
    
    def validate_markdown(self, markdown_path: str) -> Dict[str, Any]:
        """
        Validiert eine Markdown-Datei.
        
        Args:
            markdown_path: Pfad zur Markdown-Datei
            
        Returns:
            Dictionary mit Validierungsergebnis
        """
        if self.doc_converter is None:
            return {
                'success': False,
                'error': "Dokumentenkonverter nicht initialisiert",
                'is_valid': False
            }
        
        try:
            # Validiere Markdown-Datei
            result = self.doc_converter.validate_markdown(Path(markdown_path))
            return result
            
        except Exception as e:
            self.logger.error(f"Fehler bei der Validierung von {markdown_path}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'is_valid': False
            }
    
    def process_markdown_directory(self, markdown_dir: str) -> Dict[str, Any]:
        """
        Verarbeitet alle Markdown-Dateien in einem Verzeichnis (Reinigung, Strukturverbesserung, etc.).
        
        Args:
            markdown_dir: Pfad zum Markdown-Verzeichnis
            
        Returns:
            Dictionary mit Verarbeitungsergebnis
        """
        if self.doc_converter is None:
            return {
                'success': False,
                'error': "Dokumentenkonverter nicht initialisiert",
                'processed': 0
            }
        
        try:
            # Verarbeite Markdown-Dateien
            result = self.doc_converter.process_markdown_directory(Path(markdown_dir))
            
            if result.get('success', False):
                # Nach erfolgreicher Verarbeitung Dokumente neu laden
                self.logger.info(f"Markdown-Verarbeitung abgeschlossen: {result.get('processed', 0)} Dateien verarbeitet")
                
                # Lade Dokumente neu
                self.load_documents()
            
            return result
            
        except Exception as e:
            self.logger.error(f"Fehler bei der Verarbeitung von Markdown-Dateien in {markdown_dir}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'processed': 0
            }
    
    def get_converter_status(self) -> Dict[str, Any]:
        """
        Gibt den Status des Dokumentenkonverters zurück.
        
        Returns:
            Dictionary mit Statusinfo
        """
        if self.doc_converter is None:
            return {
                'available': False,
                'error': "Dokumentenkonverter nicht initialisiert"
            }
        
        try:
            # Prüfe verfügbare Konverter
            converters = {
                'pdf': hasattr(self.doc_converter, 'pdf_converter'),
                'docx': hasattr(self.doc_converter, 'docx_converter'),
                'xlsx': hasattr(self.doc_converter, 'excel_converter'),
                'pptx': hasattr(self.doc_converter, 'pptx_converter'),
                'html': hasattr(self.doc_converter, 'html_converter')
            }
            
            return {
                'available': True,
                'converters': converters,
                'post_processing': self.doc_converter.post_processing,
                'parallel_processing': self.doc_converter.parallel_processing
            }
            
        except Exception as e:
            self.logger.error(f"Fehler beim Abrufen des Konverterstatus: {e}", exc_info=True)
            return {
                'available': True,
                'error': str(e)
            }