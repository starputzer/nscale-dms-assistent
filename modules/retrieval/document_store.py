import pickle
import re
import hashlib
import threading
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

from ..core.config import Config
from ..core.logging import LogManager

logger = LogManager.setup_logging()

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
                if len(section['text']) > 50:  # Ignoriere sehr kleine Abschnitte
                    self.chunks.append({
                        'text': section['text'],
                        'file': self.filename,
                        'title': section['title'],
                        'type': 'section'
                    })
        else:
            # Fallback: Erstelle überlappende Chunks
            for i in range(0, len(self.text), Config.CHUNK_SIZE - Config.CHUNK_OVERLAP):
                chunk_text = self._preprocess_text(self.text[i:i+Config.CHUNK_SIZE])
                if len(chunk_text) > 50:
                    self.chunks.append({
                        'text': chunk_text,
                        'file': self.filename,
                        'start': i,
                        'type': 'chunk'
                    })
    
    def _extract_sections(self) -> List[Dict[str, str]]:
        """Extrahiert strukturierte Abschnitte aus dem Text"""
        sections = []
        
        # Einfache Überschriftenerkennung
        headers = re.finditer(r'(?m)^(#{1,3}|[A-Z][A-Z\s]+:|[0-9]+\.[0-9]+\s+)(.+)$', self.text)
        
        last_pos = 0
        last_header = "Einleitung"
        
        for match in headers:
            if last_pos > 0:
                # Speichere den vorherigen Abschnitt
                section_text = self._preprocess_text(self.text[last_pos:match.start()])
                if section_text:
                    sections.append({
                        'title': last_header,
                        'text': section_text,
                        'type': 'section'
                    })
            
            last_header = match.group(2).strip()
            last_pos = match.end()
        
        # Füge den letzten Abschnitt hinzu
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
        return text.strip()

class DocumentStore:
    """Verwaltet die Dokument-Kollektion und Chunking"""
    
    def __init__(self):
        self.documents = {}
        self.chunks = []
        self.doc_modified = {}
        self.lock = threading.RLock()
    
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
                for file_path in Config.TXT_DIR.glob('*.txt'):
                    try:
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
                                'size': file_path.stat().st_size,
                                'modified': modified_time,
                                'path': str(file_path)
                            }
                        )
                        
                        # Verarbeite Dokument
                        doc.process()
                        
                        # Speichere Dokument und füge Chunks hinzu
                        self.documents[file_path.name] = doc
                        self.chunks.extend(doc.chunks)
                    
                    except Exception as e:
                        logger.error(f"Fehler beim Laden von {file_path}: {e}")
                
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
            with open(cache_path, 'rb') as f:
                cached_data = pickle.load(f)
            
            cached_files = {d for d in cached_data['doc_modified']}
            current_files = {f.name for f in Config.TXT_DIR.glob('*.txt')}
            
            # Prüfe ob alle Dateien übereinstimmen
            if cached_files != current_files:
                return False
            
            # Prüfe ob Änderungsdaten übereinstimmen
            for file in current_files:
                file_path = Config.TXT_DIR / file
                modified_time = datetime.fromtimestamp(file_path.stat().st_mtime).strftime('%Y-%m-%d %H:%M')
                
                if modified_time != cached_data['doc_modified'].get(file):
                    return False
            
            # Lade Daten aus Cache
            self.documents = cached_data['documents']
            self.chunks = cached_data['chunks']
            self.doc_modified = cached_data['doc_modified']
            
            return True
        
        except Exception as e:
            logger.error(f"Fehler beim Prüfen des Cache: {e}")
            return False
    
    def _save_cache(self):
        """Speichert Dokumentenkollektion im Cache"""
        cache_path = Config.CACHE_DIR / 'documents.pkl'
        
        try:
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
