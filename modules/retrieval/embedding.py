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
        #cuda erzwingen
        self.service = "cuda"
        #self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32

    def initialize(self):
        """Initialisiert das Embedding-Modell"""
        with self.lock:
            try:
                logger.info("Lade Embedding-Modell...")

                # altes Modell
                # self.model = SentenceTransformer('paraphrase-MiniLM-L3-v2', device=self.device)
                # logger.info("Embedding-Modell geladen")

                # neues Modell (nicht verfügbar): BAAI/bge-large-de
                # self.model = SentenceTransformer('BAAI/bge-large-de', device=self.device)
                # logger.info("BAAI/bge-large-de Embedding-Modell erfolgreich geladen")

                # empfohlenes Modell: BAAI/bge-m3
                self.model = SentenceTransformer('BAAI/bge-m3', device="cuda")
                logger.info("BAAI/bge-m3 Embedding-Modell erfolgreich geladen")

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

                texts = [chunk['text'] for chunk in chunks]

                german_stopwords = list(text.ENGLISH_STOP_WORDS.union({
                    'und', 'oder', 'aber', 'nicht', 'sein', 'haben', 'werden',
                    'dies', 'ein', 'eine', 'der', 'die', 'das', 'mit', 'für',
                    'auf', 'ist', 'im', 'den', 'dem', 'des', 'wie', 'wenn', 'dann',
                    'man', 'wir', 'ich', 'sie', 'er', 'es', 'in', 'am', 'an', 'vom'
                }))

                self.tfidf_vectorizer = TfidfVectorizer(lowercase=True, stop_words=german_stopwords)
                self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(texts)

                # neue Variante: normalisierte Embeddings für BGE
                self.embeddings = self.model.encode(
                    texts,
                    show_progress_bar=True,
                    device=self.device,
                    normalize_embeddings=True,
                    batch_size=32  # oder 16 bei wenig VRAM
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

                query_embedding = self.model.encode(
                    [query],
                    device=self.device,
                    normalize_embeddings=True
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
