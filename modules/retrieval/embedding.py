import pickle
import numpy as np
import threading
from typing import List, Dict, Any, Optional
import gc
from pathlib import Path
from sklearn.feature_extraction import text
import torch

from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer

from ..core.config import Config
from ..core.logging import LogManager

logger = LogManager.setup_logging()

class EmbeddingManager:
    """Verwaltet die Erstellung und Speicherung von Embeddings"""

    def __init__(self):
        self.model = None
        self.embeddings = None
        self.tfidf_vectorizer = None
        self.tfidf_matrix = None
        self.chunks = []
        self.lock = threading.RLock()
        # Dynamische Erkennung mit Fallback
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32
        logger.info(f"Embedding-Manager initialisiert mit Gerät: {self.device}, Datentyp: {self.torch_dtype}")

    def initialize(self):
        """Initialisiert das Embedding-Modell"""
        with self.lock:
            try:
                logger.info("Lade Embedding-Modell BAAI/bge-m3...")
                
                # Explizites Freigeben von CUDA-Speicher vor dem Laden
                if self.device == "cuda":
                    torch.cuda.empty_cache()
                    gc.collect()
                    available_memory = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)
                    logger.info(f"Verfügbarer CUDA-Speicher: {available_memory / 1024**2:.2f} MB")
                
                # Modell mit optimierten Einstellungen laden
                self.model = SentenceTransformer(
                    'BAAI/bge-m3', 
                    device=self.device,
                    # Float16 auf CUDA für halben Speicherverbrauch
                    torch_dtype=self.torch_dtype
                )
                logger.info(f"BAAI/bge-m3 Embedding-Modell erfolgreich geladen auf {self.device}")
                
                return True
            except Exception as e:
                logger.error(f"Fehler beim Laden des Embedding-Modells: {e}")
                # Fallback zum leichteren Modell bei Fehlern
                try:
                    logger.info("Versuche Fallback zum leichteren Modell...")
                    self.model = SentenceTransformer('paraphrase-MiniLM-L3-v2', device=self.device)
                    logger.info(f"Fallback-Modell paraphrase-MiniLM-L3-v2 geladen")
                    return True
                except Exception as fallback_error:
                    logger.error(f"Auch Fallback-Modell fehlgeschlagen: {fallback_error}")
                    return False

    def process_chunks(self, chunks: List[Dict[str, Any]]) -> bool:
        """Verarbeitet Chunks und erstellt Embeddings mit Optimierungen für große Dokumente"""
        with self.lock:
            try:
                if not self.model:
                    logger.warning("Embedding-Modell nicht initialisiert")
                    return False

                if self._load_from_cache(chunks):
                    return True

                logger.info(f"Erstelle Embeddings für {len(chunks)} Chunks")
                self.chunks = chunks

                # OPTIMIERUNG 1: Progressive Verarbeitung in Teilmengen
                # Bei sehr vielen Chunks diese in Teilmengen verarbeiten
                max_chunks_per_batch = 200  # Maximal 200 Chunks pro Teilmenge
                
                if len(chunks) > max_chunks_per_batch:
                    logger.info(f"Verarbeite {len(chunks)} Chunks in Teilmengen von {max_chunks_per_batch}")
                    
                    # Speicher für alle verarbeiteten Embeddings
                    all_embeddings = []
                    processed_chunks = []
                    
                    # Verarbeite Chunks in Teilmengen
                    for i in range(0, len(chunks), max_chunks_per_batch):
                        batch_end = min(i + max_chunks_per_batch, len(chunks))
                        batch_chunks = chunks[i:batch_end]
                        
                        logger.info(f"Verarbeite Teilmenge {i//max_chunks_per_batch + 1} "
                                f"({i}-{batch_end} von {len(chunks)} Chunks)")
                        
                        # Extrahiere und begrenzt Texte
                        batch_texts = []
                        for chunk in batch_chunks:
                            # Begrenze Chunk-Größe auf 1500 Zeichen
                            if len(chunk['text']) > 1500:
                                chunk['text'] = chunk['text'][:1500]
                            batch_texts.append(chunk['text'])
                            processed_chunks.append(chunk)
                        
                        # Speicher freigeben vor dem Encoding
                        if self.device == "cuda":
                            torch.cuda.empty_cache()
                            gc.collect()
                        
                        # Encodiere diese Teilmenge
                        batch_embeddings = self.model.encode(
                            batch_texts,
                            show_progress_bar=True,
                            device=self.device,
                            normalize_embeddings=True,
                            batch_size=2,
                            convert_to_numpy=True
                        )
                        
                        # Füge zu Gesamtergebnissen hinzu
                        all_embeddings.append(batch_embeddings)
                        
                        # Speicher freigeben nach dem Encoding
                        if self.device == "cuda":
                            torch.cuda.empty_cache()
                            gc.collect()
                    
                    # Kombiniere alle Teilmengen
                    self.embeddings = np.vstack(all_embeddings)
                    self.chunks = processed_chunks
                    
                    # Erstelle TF-IDF Matrix für alle Chunks
                    all_texts = [chunk['text'] for chunk in processed_chunks]
                    
                    # Deutsche Stopwörter
                    german_stopwords = list(text.ENGLISH_STOP_WORDS.union({
                        'und', 'oder', 'aber', 'nicht', 'sein', 'haben', 'werden',
                        'dies', 'ein', 'eine', 'der', 'die', 'das', 'mit', 'für',
                        'auf', 'ist', 'im', 'den', 'dem', 'des', 'wie', 'wenn', 'dann',
                        'man', 'wir', 'ich', 'sie', 'er', 'es', 'in', 'am', 'an', 'vom'
                    }))
                    
                    self.tfidf_vectorizer = TfidfVectorizer(lowercase=True, stop_words=german_stopwords)
                    self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(all_texts)
                    
                else:
                    # Standardverhalten für wenige Chunks
                    texts = []
                    for chunk in chunks:
                        # Begrenze Chunk-Größe auf 1500 Zeichen
                        if len(chunk['text']) > 1500:
                            chunk['text'] = chunk['text'][:1500]
                        texts.append(chunk['text'])
                    
                    # Deutsche Stopwörter
                    german_stopwords = list(text.ENGLISH_STOP_WORDS.union({
                        'und', 'oder', 'aber', 'nicht', 'sein', 'haben', 'werden',
                        'dies', 'ein', 'eine', 'der', 'die', 'das', 'mit', 'für',
                        'auf', 'ist', 'im', 'den', 'dem', 'des', 'wie', 'wenn', 'dann',
                        'man', 'wir', 'ich', 'sie', 'er', 'es', 'in', 'am', 'an', 'vom'
                    }))
                    
                    self.tfidf_vectorizer = TfidfVectorizer(lowercase=True, stop_words=german_stopwords)
                    self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(texts)
                    
                    # Speicher freigeben vor dem Encoding
                    if self.device == "cuda":
                        torch.cuda.empty_cache()
                        gc.collect()
                    
                    # Encodiere direkt
                    self.embeddings = self.model.encode(
                        texts,
                        show_progress_bar=True,
                        device=self.device,
                        normalize_embeddings=True,
                        batch_size=2,
                        convert_to_numpy=True
                    )

                self._save_to_cache()
                logger.info("Embeddings erfolgreich erstellt")
                return True

            except Exception as e:
                logger.error(f"Fehler bei der Erstellung von Embeddings: {e}")
                return False

    def _load_from_cache(self, chunks: List[Dict[str, Any]]) -> bool:
        """Lädt Embeddings aus dem Cache"""
        if not Config.EMBED_CACHE_PATH.exists():
            return False

        try:
            with open(Config.EMBED_CACHE_PATH, 'rb') as f:
                cached_data = pickle.load(f)

            # Prüfen, ob Cache aktuell ist
            if (len(cached_data['chunks']) != len(chunks) or
                not all(c1['text'] == c2['text'] for c1, c2 in zip(cached_data['chunks'], chunks))):
                logger.info("Cache ist nicht mehr aktuell")
                return False

            logger.info("Lade Embeddings aus Cache")
            self.chunks = chunks
            self.embeddings = cached_data['embeddings']
            self.tfidf_vectorizer = cached_data['tfidf_vectorizer']
            self.tfidf_matrix = cached_data['tfidf_matrix']

            return True

        except Exception as e:
            logger.error(f"Fehler beim Laden aus Cache: {e}")
            return False

    def _save_to_cache(self):
        """Speichert Embeddings im Cache"""
        try:
            Config.EMBED_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)

            with open(Config.EMBED_CACHE_PATH, 'wb') as f:
                pickle.dump({
                    'chunks': self.chunks,
                    'embeddings': self.embeddings,
                    'tfidf_vectorizer': self.tfidf_vectorizer,
                    'tfidf_matrix': self.tfidf_matrix
                }, f)

            logger.info("Embeddings im Cache gespeichert")

        except Exception as e:
            logger.error(f"Fehler beim Speichern in Cache: {e}")

    def search(self, query: str, top_k: int = None) -> List[Dict[str, Any]]:
        """Führt eine Hybrid-Suche durch und gibt die relevantesten Chunks zurück"""
        if top_k is None:
            top_k = Config.TOP_K

        with self.lock:
            if not self.model or self.embeddings is None:
                logger.warning("Embedding-Modell oder Embeddings nicht initialisiert")
                return []

            try:
                # TF-IDF Komponente (wichtig für Terme, die nicht im semantischen Raum sind)
                query_vec = self.tfidf_vectorizer.transform([query])
                tfidf_scores = np.array(query_vec @ self.tfidf_matrix.T.toarray()).flatten()

                # Semantische Komponente mit normalisierten Embeddings
                query_embedding = self.model.encode(
                    [query],
                    device=self.device,
                    normalize_embeddings=True  # Wichtig für BGE-Modelle
                )[0]

                # Kosinus-Ähnlichkeit berechnen
                semantic_scores = np.dot(self.embeddings, query_embedding)

                # Normalisieren der Scores
                tfidf_scores = tfidf_scores / max(tfidf_scores.max(), 1e-5)
                semantic_scores = semantic_scores / max(semantic_scores.max(), 1e-5)

                # Gewichtete Kombination (kann je nach Präferenz angepasst werden)
                combined_scores = (
                    (1 - Config.SEMANTIC_WEIGHT) * tfidf_scores +
                    Config.SEMANTIC_WEIGHT * semantic_scores
                )
                top_indices = combined_scores.argsort()[-top_k:][::-1]

                # Ergebnisliste aufbauen
                results = []
                for i in top_indices:
                    if combined_scores[i] > 0:
                        chunk = self.chunks[i].copy()
                        chunk['score'] = float(combined_scores[i])
                        results.append(chunk)

                return results

            except Exception as e:
                logger.error(f"Fehler bei der Suche: {e}")
                return []