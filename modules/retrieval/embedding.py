import pickle
import numpy as np
import threading
from typing import List, Dict, Any, Optional
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
        # Dynamische Erkennung verwenden statt erzwingen
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32

    def initialize(self):
        """Initialisiert das Embedding-Modell"""
        with self.lock:
            try:
                logger.info("Lade Embedding-Modell...")
                
                # Verwende das leichtere Modell für bessere Kompatibilität
                self.model = SentenceTransformer('paraphrase-MiniLM-L3-v2', device=self.device)
                logger.info(f"Embedding-Modell paraphrase-MiniLM-L3-v2 erfolgreich geladen auf {self.device}")
                
                return True
            except Exception as e:
                logger.error(f"Fehler beim Laden des Embedding-Modells: {e}")
                return False

    def process_chunks(self, chunks: List[Dict[str, Any]]) -> bool:
        """Verarbeitet Chunks und erstellt Embeddings"""
        with self.lock:
            try:
                if not self.model:
                    logger.warning("Embedding-Modell nicht initialisiert")
                    return False

                if self._load_from_cache(chunks):
                    return True

                logger.info(f"Erstelle Embeddings für {len(chunks)} Chunks")
                self.chunks = chunks

                # Begrenze die maximale Textlänge für bessere Verarbeitung
                texts = []
                for chunk in chunks:
                    # Begrenze Chunk-Größe auf 2000 Zeichen
                    if len(chunk['text']) > 2000:
                        logger.info(f"Kürze Chunk von {len(chunk['text'])} auf 2000 Zeichen")
                        chunk['text'] = chunk['text'][:2000]
                    texts.append(chunk['text'])

                german_stopwords = list(text.ENGLISH_STOP_WORDS.union({
                    'und', 'oder', 'aber', 'nicht', 'sein', 'haben', 'werden',
                    'dies', 'ein', 'eine', 'der', 'die', 'das', 'mit', 'für',
                    'auf', 'ist', 'im', 'den', 'dem', 'des', 'wie', 'wenn', 'dann',
                    'man', 'wir', 'ich', 'sie', 'er', 'es', 'in', 'am', 'an', 'vom'
                }))

                self.tfidf_vectorizer = TfidfVectorizer(lowercase=True, stop_words=german_stopwords)
                self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(texts)

                logger.info(f"Textlängenstatistik für {len(texts)} Chunks:")
                max_len = max(len(t) for t in texts)
                min_len = min(len(t) for t in texts)
                avg_len = sum(len(t) for t in texts) / len(texts)
                logger.info(f"➤ Max: {max_len}, Min: {min_len}, ⌀: {avg_len:.2f} Zeichen")

                # Verarbeite in kleineren Batches (4 statt 16)
                # Bei sehr vielen Chunks ist ein kleinerer Batch besser für den Speicherverbrauch
                self.embeddings = self.model.encode(
                    texts,
                    show_progress_bar=True,
                    device=self.device,
                    batch_size=4,  # Reduziert für bessere Speichernutzung
                    convert_to_numpy=True  # Garantiere numpy-Arrays für Kompatibilität
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
                query_vec = self.tfidf_vectorizer.transform([query])
                tfidf_scores = np.array(query_vec @ self.tfidf_matrix.T.toarray()).flatten()

                # Für das kleinere Modell statt normalize_embeddings=True
                query_embedding = self.model.encode(
                    [query],
                    device=self.device
                )[0]

                semantic_scores = np.dot(self.embeddings, query_embedding)

                tfidf_scores = tfidf_scores / max(tfidf_scores.max(), 1e-5)
                semantic_scores = semantic_scores / max(semantic_scores.max(), 1e-5)

                combined_scores = (
                    (1 - Config.SEMANTIC_WEIGHT) * tfidf_scores +
                    Config.SEMANTIC_WEIGHT * semantic_scores
                )
                top_indices = combined_scores.argsort()[-top_k:][::-1]

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