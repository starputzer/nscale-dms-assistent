import pickle
import re
import hashlib
import threading
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from collections import deque

from ..core.config import Config
from ..core.logging import LogManager

logger = LogManager.setup_logging(__name__)

class Document:
    """Repräsentiert ein einzelnes Dokument"""

    def __init__(self, text: str, filename: str, metadata: Optional[Dict[str, Any]] = None):
        self.text = text
        self.filename = filename
        self.metadata = metadata or {}
        self.chunks = []

    def process(self, use_semantic_chunking: bool = True):
        """Verarbeitet das Dokument mit intelligenten Chunking-Strategien"""
        self.chunks = []

        if use_semantic_chunking:
            # Phase 1: Semantic Chunking mit hierarchischer Struktur
            logger.info(f"🧠 Verwende Semantic Chunking für {self.filename}")
            
            # 1. Extrahiere hierarchische Struktur
            sections = self._extract_hierarchical_sections()
            
            if sections:
                # 2. Verarbeite Sections mit Kontext-Bewahrung
                for section in sections:
                    if len(section['text']) > 50:
                        # Semantic Chunking innerhalb der Section
                        semantic_chunks = self._semantic_chunk_section(
                            section['text'], 
                            section_title=section['title'],
                            hierarchy_level=section.get('level', 1)
                        )
                        self.chunks.extend(semantic_chunks)
            else:
                # Fallback: Intelligentes satzbasiertes Chunking
                semantic_chunks = self._semantic_chunk_text(self.text)
                self.chunks.extend(semantic_chunks)
                
            # 3. Berechne Chunk-Qualität und optimiere
            self._optimize_chunks()
            
        else:
            # Legacy-Chunking für Kompatibilität
            self._legacy_chunk_processing()

        logger.info(f"📄 {self.filename} → {len(self.chunks)} optimierte Chunks erstellt")

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

    def _extract_hierarchical_sections(self) -> List[Dict[str, Any]]:
        """Extrahiert hierarchische Struktur mit verbesserter Pattern-Erkennung"""
        sections = []
        
        # Erweiterte Patterns für verschiedene Dokumenttypen
        header_patterns = [
            (r'^(#{1,6})\s+(.+)$', 'markdown'),  # Markdown headers
            (r'^([1-9]\d?\.(?:\d+\.)*)\s+(.+)$', 'numbered'),  # 1.2.3 Style
            (r'^([A-Z][A-Z\s]{2,}):?\s*$', 'caps'),  # GROSSBUCHSTABEN
            (r'^(\w+)\s*:\s*$', 'colon'),  # Label: style
            (r'^[-*]\s*(.+?)\s*[-*]?\s*$', 'decorated'),  # --- Header ---
        ]
        
        # Sammle alle Headers mit Position und Level
        all_headers = []
        for pattern, style in header_patterns:
            for match in re.finditer(pattern, self.text, re.MULTILINE):
                level = self._determine_hierarchy_level(match, style)
                all_headers.append({
                    'match': match,
                    'level': level,
                    'style': style,
                    'title': self._clean_header_title(match.group(2) if style not in ['caps', 'colon', 'decorated'] else match.group(1))
                })
        
        # Sortiere nach Position
        all_headers.sort(key=lambda x: x['match'].start())
        
        # Erstelle Sections mit hierarchischer Struktur
        for i, header in enumerate(all_headers):
            start = header['match'].end()
            end = all_headers[i + 1]['match'].start() if i + 1 < len(all_headers) else len(self.text)
            
            section_text = self._preprocess_text(self.text[start:end])
            if section_text and len(section_text) > 30:  # Mindestlänge
                sections.append({
                    'title': header['title'],
                    'text': section_text,
                    'level': header['level'],
                    'type': 'section',
                    'style': header['style']
                })
        
        return sections

    def _determine_hierarchy_level(self, match: re.Match, style: str) -> int:
        """Bestimmt die Hierarchie-Ebene eines Headers"""
        if style == 'markdown':
            return len(match.group(1))  # Anzahl der #
        elif style == 'numbered':
            return match.group(1).count('.') + 1
        elif style == 'caps':
            return 1  # Hauptüberschriften
        else:
            return 2  # Unterüberschriften

    def _clean_header_title(self, title: str) -> str:
        """Bereinigt Header-Titel"""
        title = re.sub(r'[#*\-_]+', '', title).strip()
        title = re.sub(r'\s+', ' ', title)
        return title

    def _semantic_chunk_section(self, text: str, section_title: str, hierarchy_level: int) -> List[Dict[str, Any]]:
        """Semantic Chunking mit Kontext-Bewahrung für eine Section"""
        chunks = []
        
        # Dynamische Chunk-Größe basierend auf Hierarchie-Level
        base_size = 600
        max_size = base_size + (3 - hierarchy_level) * 200  # Höhere Level = größere Chunks
        min_size = 200
        
        # Semantic Boundaries erkennen
        paragraphs = self._split_into_paragraphs(text)
        current_chunk = f"[{section_title}]\n" if section_title else ""
        current_size = len(current_chunk)
        
        for para in paragraphs:
            para_size = len(para)
            
            # Entscheide ob Paragraph in aktuellen Chunk passt
            if current_size + para_size > max_size and current_size > min_size:
                # Speichere aktuellen Chunk
                if current_chunk.strip():
                    chunks.append(self._create_chunk_dict(
                        current_chunk.strip(),
                        chunk_type='semantic',
                        metadata={
                            'section_title': section_title,
                            'hierarchy_level': hierarchy_level,
                            'coherence_score': self._calculate_coherence(current_chunk)
                        }
                    ))
                # Starte neuen Chunk mit Kontext
                current_chunk = f"[Kontext: {section_title}]\n{para}\n"
                current_size = len(current_chunk)
            else:
                current_chunk += para + "\n"
                current_size += para_size + 1
        
        # Letzten Chunk hinzufügen
        if current_chunk.strip():
            chunks.append(self._create_chunk_dict(
                current_chunk.strip(),
                chunk_type='semantic',
                metadata={
                    'section_title': section_title,
                    'hierarchy_level': hierarchy_level,
                    'coherence_score': self._calculate_coherence(current_chunk)
                }
            ))
        
        return chunks

    def _semantic_chunk_text(self, text: str) -> List[Dict[str, Any]]:
        """Fallback semantic chunking für unstrukturierte Texte"""
        chunks = []
        
        # Nutze Sliding Window mit semantischer Grenzenerkennung
        sentences = self._split_into_sentences(text)
        
        if not sentences:
            return []
        
        # Sliding window parameters
        window_size = 5  # Sätze pro initialer Betrachtung
        stride = 3  # Überlappung
        
        i = 0
        while i < len(sentences):
            # Sammle Sätze für aktuellen Chunk
            chunk_sentences = []
            chunk_size = 0
            target_size = 600
            
            # Füge Sätze hinzu bis Zielgröße erreicht
            j = i
            while j < len(sentences) and chunk_size < target_size:
                sentence = sentences[j]
                chunk_sentences.append(sentence)
                chunk_size += len(sentence)
                
                # Prüfe semantische Grenze
                if j + 1 < len(sentences):
                    if self._is_semantic_boundary(sentence, sentences[j + 1]):
                        break
                j += 1
            
            if chunk_sentences:
                chunk_text = ' '.join(chunk_sentences)
                chunks.append(self._create_chunk_dict(
                    chunk_text,
                    chunk_type='semantic_fallback',
                    metadata={
                        'coherence_score': self._calculate_coherence(chunk_text),
                        'sentence_count': len(chunk_sentences)
                    }
                ))
            
            # Bewege Window mit Überlappung
            i = max(i + stride, j)
        
        return chunks

    def _split_into_paragraphs(self, text: str) -> List[str]:
        """Teilt Text in Paragraphen"""
        # Mehrere Zeilenumbrüche als Paragraph-Grenze
        paragraphs = re.split(r'\n\s*\n', text)
        return [p.strip() for p in paragraphs if p.strip()]

    def _split_into_sentences(self, text: str) -> List[str]:
        """Verbesserte Satz-Erkennung"""
        # Berücksichtige Abkürzungen und Sonderzeichen
        abbreviations = {'Dr.', 'Prof.', 'z.B.', 'bzw.', 'etc.', 'usw.', 'ca.', 'inkl.', 'exkl.'}
        
        # Schütze Abkürzungen temporär
        protected_text = text
        for abbr in abbreviations:
            protected_text = protected_text.replace(abbr, abbr.replace('.', '<!DOT!>'))
        
        # Splitte an Satzenden
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', protected_text)
        
        # Stelle Abkürzungen wieder her
        sentences = [s.replace('<!DOT!>', '.') for s in sentences]
        
        return [s.strip() for s in sentences if s.strip()]

    def _is_semantic_boundary(self, sent1: str, sent2: str) -> bool:
        """Erkennt semantische Grenzen zwischen Sätzen"""
        # Einfache Heuristiken für semantische Grenzen
        
        # Neue Überschrift/Abschnitt
        if re.match(r'^[A-Z][A-Z\s]+:?\s*$', sent2):
            return True
        
        # Themawechsel-Indikatoren
        transition_words = ['jedoch', 'allerdings', 'andererseits', 'im gegensatz', 
                          'zusammenfassend', 'abschließend', 'erstens', 'zweitens']
        if any(sent2.lower().startswith(word) for word in transition_words):
            return True
        
        # Große Längenunterschiede können auf Themawechsel hindeuten
        if abs(len(sent1) - len(sent2)) > 200:
            return True
        
        return False

    def _calculate_coherence(self, text: str) -> float:
        """Berechnet Kohärenz-Score eines Chunks"""
        # Einfache Kohärenz-Metrik basierend auf Wortwiederholungen
        words = re.findall(r'\b\w+\b', text.lower())
        if len(words) < 10:
            return 0.5
        
        # Berechne Wort-Wiederholungsrate
        unique_words = set(words)
        repetition_rate = 1 - (len(unique_words) / len(words))
        
        # Berücksichtige Satzlängen-Konsistenz
        sentences = self._split_into_sentences(text)
        if len(sentences) > 1:
            lengths = [len(s.split()) for s in sentences]
            avg_length = np.mean(lengths)
            std_length = np.std(lengths)
            consistency = 1 - (std_length / (avg_length + 1))
        else:
            consistency = 0.5
        
        # Kombiniere Metriken
        coherence = (repetition_rate * 0.4 + consistency * 0.6)
        return min(max(coherence, 0.0), 1.0)

    def _create_chunk_dict(self, text: str, chunk_type: str = 'chunk', metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Erstellt standardisiertes Chunk-Dictionary"""
        chunk = {
            'text': text,
            'file': self.filename,
            'type': chunk_type,
            'length': len(text)
        }
        
        if metadata:
            chunk.update(metadata)
            
        return chunk

    def _optimize_chunks(self):
        """Optimiert Chunks nach Erstellung"""
        if not self.chunks:
            return
        
        # 1. Entferne zu kleine Chunks
        min_length = 100
        self.chunks = [c for c in self.chunks if c.get('length', len(c['text'])) >= min_length]
        
        # 2. Merge sehr ähnliche aufeinanderfolgende Chunks
        optimized = []
        i = 0
        
        while i < len(self.chunks):
            current = self.chunks[i]
            
            # Prüfe ob nächster Chunk gemerged werden sollte
            if i + 1 < len(self.chunks):
                next_chunk = self.chunks[i + 1]
                
                # Merge-Kriterien
                should_merge = (
                    current.get('section_title') == next_chunk.get('section_title') and
                    current.get('length', 0) + next_chunk.get('length', 0) < 1000 and
                    current.get('coherence_score', 0) > 0.7 and
                    next_chunk.get('coherence_score', 0) > 0.7
                )
                
                if should_merge:
                    # Merge chunks
                    merged_text = current['text'] + '\n' + next_chunk['text']
                    merged_chunk = self._create_chunk_dict(
                        merged_text,
                        chunk_type='merged',
                        metadata={
                            'section_title': current.get('section_title'),
                            'coherence_score': self._calculate_coherence(merged_text),
                            'merged_from': 2
                        }
                    )
                    optimized.append(merged_chunk)
                    i += 2  # Skip next chunk
                    continue
            
            optimized.append(current)
            i += 1
        
        self.chunks = optimized
        
        # 3. Log Optimierungsergebnisse
        avg_length = np.mean([c.get('length', len(c['text'])) for c in self.chunks])
        avg_coherence = np.mean([c.get('coherence_score', 0.5) for c in self.chunks])
        
        logger.info(f"📊 Chunk-Optimierung: {len(self.chunks)} Chunks, "
                   f"Ø Länge: {avg_length:.0f}, Ø Kohärenz: {avg_coherence:.2f}")

    def _legacy_chunk_processing(self):
        """Legacy chunking method für Rückwärtskompatibilität"""
        chunked = self._chunk_text_by_sentences(self.text, max_chars=800)
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