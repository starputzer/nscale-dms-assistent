"""
Semantic Chunking Implementation for RAG Optimization
Intelligente Chunk-Strategie mit semantischer Kohärenz
"""
import re
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer
import spacy
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """Datenstruktur für einen semantischen Chunk"""
    text: str
    start_pos: int
    end_pos: int
    chunk_type: str  # 'section', 'paragraph', 'sentence', 'table'
    metadata: Dict[str, Any]
    coherence_score: float
    size: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'text': self.text,
            'start': self.start_pos,
            'end': self.end_pos,
            'type': self.chunk_type,
            'metadata': self.metadata,
            'coherence_score': self.coherence_score,
            'size': self.size
        }


class SemanticChunker:
    """
    Intelligenter Chunker mit semantischer Kohärenz-Bewertung
    """
    
    def __init__(self, 
                 min_chunk_size: int = 200,
                 target_chunk_size: int = 600,
                 max_chunk_size: int = 1000,
                 overlap_ratio: float = 0.15,
                 language: str = 'de'):
        
        self.min_chunk_size = min_chunk_size
        self.target_chunk_size = target_chunk_size
        self.max_chunk_size = max_chunk_size
        self.overlap_ratio = overlap_ratio
        self.language = language
        
        # Lazy Loading der Modelle
        self._nlp = None
        self._embedder = None
        
        # Regex-Patterns für Struktur-Erkennung
        self.section_pattern = re.compile(
            r'^(#{1,6}\s+|'  # Markdown headers
            r'\d+\.?\s+|'    # Nummerierte Überschriften
            r'[A-Z][A-Z\s]{2,}$|'  # GROSSBUCHSTABEN-ÜBERSCHRIFTEN
            r'.*:$)',        # Überschriften mit Doppelpunkt
            re.MULTILINE
        )
        
        self.table_pattern = re.compile(
            r'(\|[^\n]+\|[\n\s]*\|[-:\s]+\|)',  # Markdown-Tabellen
            re.MULTILINE
        )
        
    @property
    def nlp(self):
        """Lazy Loading des Spacy-Modells"""
        if self._nlp is None:
            try:
                self._nlp = spacy.load("de_core_news_md")
            except:
                logger.warning("Deutsches Spacy-Modell nicht gefunden, verwende englisches")
                self._nlp = spacy.load("en_core_web_md")
        return self._nlp
    
    @property
    def embedder(self):
        """Lazy Loading des Embedding-Modells"""
        if self._embedder is None:
            self._embedder = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        return self._embedder
    
    def chunk_document(self, 
                      text: str, 
                      metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        """
        Hauptmethode für intelligentes Chunking
        """
        if not text or len(text.strip()) < self.min_chunk_size:
            return []
        
        metadata = metadata or {}
        
        # 1. Struktur-Analyse
        structure = self._analyze_structure(text)
        
        # 2. Wähle optimale Chunking-Strategie
        if structure['has_sections']:
            chunks = self._hierarchical_chunking(text, structure)
        elif structure['has_tables']:
            chunks = self._table_aware_chunking(text, structure)
        else:
            chunks = self._semantic_sentence_chunking(text)
        
        # 3. Overlap hinzufügen
        chunks = self._add_overlap(chunks)
        
        # 4. Qualitäts-Scoring
        chunks = self._score_chunk_quality(chunks)
        
        # 5. Metadaten anreichern
        chunks = self._enrich_metadata(chunks, metadata)
        
        # 6. Deduplizierung
        chunks = self._deduplicate_chunks(chunks)
        
        return chunks
    
    def _analyze_structure(self, text: str) -> Dict[str, Any]:
        """Analysiert die Dokumentstruktur"""
        sections = list(self.section_pattern.finditer(text))
        tables = list(self.table_pattern.finditer(text))
        
        # Satz-Analyse
        doc = self.nlp(text[:5000])  # Nur Anfang für Performance
        avg_sentence_length = np.mean([len(sent.text) for sent in doc.sents]) if doc.sents else 0
        
        return {
            'has_sections': len(sections) > 2,
            'has_tables': len(tables) > 0,
            'section_positions': [(m.start(), m.end()) for m in sections],
            'table_positions': [(m.start(), m.end()) for m in tables],
            'avg_sentence_length': avg_sentence_length,
            'total_length': len(text)
        }
    
    def _hierarchical_chunking(self, 
                              text: str, 
                              structure: Dict[str, Any]) -> List[Chunk]:
        """Chunking basierend auf Dokumenthierarchie"""
        chunks = []
        section_positions = structure['section_positions']
        
        if not section_positions:
            return self._semantic_sentence_chunking(text)
        
        # Sortiere Sektionen nach Position
        section_positions.sort(key=lambda x: x[0])
        
        for i, (start, end) in enumerate(section_positions):
            # Bestimme Sektionsende
            if i < len(section_positions) - 1:
                section_end = section_positions[i + 1][0]
            else:
                section_end = len(text)
            
            # Extrahiere Sektion
            section_text = text[start:section_end].strip()
            
            if len(section_text) <= self.max_chunk_size:
                # Kleine Sektion als ein Chunk
                chunks.append(Chunk(
                    text=section_text,
                    start_pos=start,
                    end_pos=section_end,
                    chunk_type='section',
                    metadata={'section_header': text[start:end].strip()},
                    coherence_score=1.0,  # Sektionen sind kohärent
                    size=len(section_text)
                ))
            else:
                # Große Sektion weiter unterteilen
                sub_chunks = self._split_large_section(section_text, start)
                chunks.extend(sub_chunks)
        
        return chunks
    
    def _split_large_section(self, section_text: str, offset: int) -> List[Chunk]:
        """Teilt große Sektionen in kleinere Chunks"""
        chunks = []
        doc = self.nlp(section_text)
        
        current_chunk = []
        current_size = 0
        
        for sent in doc.sents:
            sent_text = sent.text.strip()
            sent_size = len(sent_text)
            
            # Prüfe ob neuer Chunk nötig
            if current_size + sent_size > self.target_chunk_size and current_chunk:
                # Erstelle Chunk
                chunk_text = ' '.join(current_chunk)
                chunks.append(Chunk(
                    text=chunk_text,
                    start_pos=offset,
                    end_pos=offset + len(chunk_text),
                    chunk_type='paragraph',
                    metadata={},
                    coherence_score=0.0,  # Wird später berechnet
                    size=len(chunk_text)
                ))
                
                offset += len(chunk_text) + 1
                current_chunk = [sent_text]
                current_size = sent_size
            else:
                current_chunk.append(sent_text)
                current_size += sent_size + 1
        
        # Letzter Chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunks.append(Chunk(
                text=chunk_text,
                start_pos=offset,
                end_pos=offset + len(chunk_text),
                chunk_type='paragraph',
                metadata={},
                coherence_score=0.0,
                size=len(chunk_text)
            ))
        
        return chunks
    
    def _semantic_sentence_chunking(self, text: str) -> List[Chunk]:
        """Semantisches Chunking basierend auf Satz-Ähnlichkeit"""
        chunks = []
        doc = self.nlp(text)
        sentences = [sent.text.strip() for sent in doc.sents]
        
        if not sentences:
            return []
        
        # Berechne Satz-Embeddings
        embeddings = self.embedder.encode(sentences)
        
        current_chunk = [sentences[0]]
        current_size = len(sentences[0])
        chunk_start = 0
        
        for i in range(1, len(sentences)):
            sent = sentences[i]
            sent_size = len(sent)
            
            # Berechne semantische Ähnlichkeit zum aktuellen Chunk
            if current_chunk:
                chunk_embedding = np.mean([embeddings[j] for j in range(
                    i - len(current_chunk), i)], axis=0)
                similarity = cosine_similarity(
                    [embeddings[i]], [chunk_embedding])[0][0]
            else:
                similarity = 0
            
            # Entscheide ob Satz zum Chunk gehört
            if (current_size + sent_size <= self.max_chunk_size and 
                (similarity > 0.7 or current_size < self.min_chunk_size)):
                current_chunk.append(sent)
                current_size += sent_size + 1
            else:
                # Erstelle Chunk
                chunk_text = ' '.join(current_chunk)
                chunks.append(Chunk(
                    text=chunk_text,
                    start_pos=chunk_start,
                    end_pos=chunk_start + len(chunk_text),
                    chunk_type='sentence',
                    metadata={'avg_similarity': similarity},
                    coherence_score=0.0,
                    size=len(chunk_text)
                ))
                
                chunk_start += len(chunk_text) + 1
                current_chunk = [sent]
                current_size = sent_size
        
        # Letzter Chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunks.append(Chunk(
                text=chunk_text,
                start_pos=chunk_start,
                end_pos=chunk_start + len(chunk_text),
                chunk_type='sentence',
                metadata={},
                coherence_score=0.0,
                size=len(chunk_text)
            ))
        
        return chunks
    
    def _table_aware_chunking(self, text: str, structure: Dict[str, Any]) -> List[Chunk]:
        """Spezielles Chunking für Tabellen-lastige Dokumente"""
        chunks = []
        table_positions = structure['table_positions']
        last_pos = 0
        
        for table_start, table_end in table_positions:
            # Text vor Tabelle
            if table_start > last_pos:
                pre_text = text[last_pos:table_start].strip()
                if pre_text:
                    pre_chunks = self._semantic_sentence_chunking(pre_text)
                    for chunk in pre_chunks:
                        chunk.start_pos += last_pos
                        chunk.end_pos += last_pos
                    chunks.extend(pre_chunks)
            
            # Tabelle als eigener Chunk
            table_text = text[table_start:table_end]
            chunks.append(Chunk(
                text=table_text,
                start_pos=table_start,
                end_pos=table_end,
                chunk_type='table',
                metadata={'table_format': 'markdown'},
                coherence_score=1.0,  # Tabellen sind in sich kohärent
                size=len(table_text)
            ))
            
            last_pos = table_end
        
        # Rest-Text
        if last_pos < len(text):
            rest_text = text[last_pos:].strip()
            if rest_text:
                rest_chunks = self._semantic_sentence_chunking(rest_text)
                for chunk in rest_chunks:
                    chunk.start_pos += last_pos
                    chunk.end_pos += last_pos
                chunks.extend(rest_chunks)
        
        return chunks
    
    def _add_overlap(self, chunks: List[Chunk]) -> List[Chunk]:
        """Fügt Overlap zwischen Chunks hinzu"""
        if not chunks or self.overlap_ratio <= 0:
            return chunks
        
        overlapped_chunks = []
        
        for i, chunk in enumerate(chunks):
            if i == 0:
                # Erster Chunk - kein vorheriger Overlap
                overlapped_chunks.append(chunk)
            else:
                # Berechne Overlap-Größe
                prev_chunk = chunks[i-1]
                overlap_size = int(prev_chunk.size * self.overlap_ratio)
                
                if overlap_size > 0:
                    # Füge Overlap-Text hinzu
                    overlap_text = prev_chunk.text[-overlap_size:]
                    new_text = overlap_text + " " + chunk.text
                    
                    # Erstelle neuen Chunk mit Overlap
                    new_chunk = Chunk(
                        text=new_text,
                        start_pos=chunk.start_pos - overlap_size,
                        end_pos=chunk.end_pos,
                        chunk_type=chunk.chunk_type,
                        metadata={**chunk.metadata, 'has_overlap': True},
                        coherence_score=chunk.coherence_score,
                        size=len(new_text)
                    )
                    overlapped_chunks.append(new_chunk)
                else:
                    overlapped_chunks.append(chunk)
        
        return overlapped_chunks
    
    def _score_chunk_quality(self, chunks: List[Chunk]) -> List[Chunk]:
        """Bewertet die Qualität jedes Chunks"""
        if not chunks:
            return chunks
        
        # Berechne Embeddings für alle Chunks
        chunk_texts = [chunk.text for chunk in chunks]
        embeddings = self.embedder.encode(chunk_texts)
        
        for i, chunk in enumerate(chunks):
            # Kohärenz-Score basierend auf internem Zusammenhang
            sentences = [s.text for s in self.nlp(chunk.text).sents]
            if len(sentences) > 1:
                sent_embeddings = self.embedder.encode(sentences)
                # Durchschnittliche paarweise Ähnlichkeit
                similarities = []
                for j in range(len(sent_embeddings) - 1):
                    sim = cosine_similarity(
                        [sent_embeddings[j]], 
                        [sent_embeddings[j + 1]]
                    )[0][0]
                    similarities.append(sim)
                chunk.coherence_score = np.mean(similarities) if similarities else 0.5
            else:
                chunk.coherence_score = 1.0  # Einzelne Sätze sind kohärent
            
            # Weitere Qualitäts-Metriken
            chunk.metadata.update({
                'sentence_count': len(sentences),
                'avg_sentence_length': np.mean([len(s) for s in sentences]),
                'size_ratio': chunk.size / self.target_chunk_size,
                'quality_score': self._calculate_quality_score(chunk)
            })
        
        return chunks
    
    def _calculate_quality_score(self, chunk: Chunk) -> float:
        """Berechnet einen Gesamt-Qualitäts-Score"""
        # Größen-Score (optimal bei target_size)
        size_score = 1.0 - abs(chunk.size - self.target_chunk_size) / self.target_chunk_size
        size_score = max(0, min(1, size_score))
        
        # Gewichtete Kombination
        quality_score = (
            0.5 * chunk.coherence_score +
            0.3 * size_score +
            0.2 * (1.0 if chunk.chunk_type in ['section', 'table'] else 0.7)
        )
        
        return round(quality_score, 3)
    
    def _enrich_metadata(self, 
                        chunks: List[Chunk], 
                        doc_metadata: Dict[str, Any]) -> List[Chunk]:
        """Reichert Chunks mit Dokument-Metadaten an"""
        for i, chunk in enumerate(chunks):
            chunk.metadata.update({
                'chunk_index': i,
                'total_chunks': len(chunks),
                'document_metadata': doc_metadata,
                'relative_position': i / len(chunks) if len(chunks) > 0 else 0
            })
        
        return chunks
    
    def _deduplicate_chunks(self, chunks: List[Chunk]) -> List[Chunk]:
        """Entfernt duplizierte oder sehr ähnliche Chunks"""
        if len(chunks) <= 1:
            return chunks
        
        unique_chunks = [chunks[0]]
        chunk_embeddings = self.embedder.encode([chunk.text for chunk in chunks])
        
        for i in range(1, len(chunks)):
            is_duplicate = False
            
            # Prüfe Ähnlichkeit zu bereits akzeptierten Chunks
            for j, unique_chunk in enumerate(unique_chunks):
                similarity = cosine_similarity(
                    [chunk_embeddings[i]], 
                    [chunk_embeddings[chunks.index(unique_chunk)]]
                )[0][0]
                
                # Wenn sehr ähnlich (>0.95), als Duplikat markieren
                if similarity > 0.95:
                    is_duplicate = True
                    logger.info(f"Duplikat gefunden: Chunk {i} ähnlich zu Chunk {j}")
                    break
            
            if not is_duplicate:
                unique_chunks.append(chunks[i])
        
        return unique_chunks


# Utility-Funktionen für Testing und Integration
def test_semantic_chunker():
    """Test-Funktion für den Semantic Chunker"""
    chunker = SemanticChunker()
    
    # Test-Text
    test_text = """
# Einführung in nscale
nscale ist ein Enterprise Content Management System. Es ermöglicht die effiziente Verwaltung von Dokumenten.

## Hauptfunktionen
Die wichtigsten Funktionen umfassen:
- Dokumentenverwaltung
- Workflow-Automatisierung
- Compliance-Features

### Dokumentenverwaltung
Die Dokumentenverwaltung in nscale basiert auf einem hierarchischen System. 
Dokumente können in Ordnern organisiert werden. Jedes Dokument hat Metadaten.

| Feature | Beschreibung |
|---------|--------------|
| Versionierung | Automatische Versionskontrolle |
| Suche | Volltext- und Metadatensuche |

## Installation
Die Installation erfolgt über den Installer...
"""
    
    chunks = chunker.chunk_document(test_text, {'source': 'test.md'})
    
    print(f"Anzahl Chunks: {len(chunks)}")
    for i, chunk in enumerate(chunks):
        print(f"\nChunk {i+1}:")
        print(f"  Typ: {chunk.chunk_type}")
        print(f"  Größe: {chunk.size}")
        print(f"  Kohärenz: {chunk.coherence_score:.3f}")
        print(f"  Qualität: {chunk.metadata.get('quality_score', 0):.3f}")
        print(f"  Text: {chunk.text[:100]}...")


if __name__ == "__main__":
    test_semantic_chunker()