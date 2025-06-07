import pickle
import numpy as np
import threading
from typing import List, Dict, Any, Optional
import gc
<<<<<<< HEAD
import re
import gzip
from pathlib import Path
from datetime import datetime
=======
from pathlib import Path
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
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
                # Modell mit optimierten Einstellungen laden - ohne torch_dtype
                self.model = SentenceTransformer(
                    'BAAI/bge-m3', 
                    device=self.device
                )

                # Wenn wir torch_dtype verwenden wollen, müssen wir es danach manuell setzen
                if self.device == "cuda":
                    # Modell manuell in float16 konvertieren
                    self.model.half()  # Dies konvertiert das Modell zu float16
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
<<<<<<< HEAD
        """Phase 1: Advanced preprocessing und optimierte Embedding-Erstellung"""
=======
        """Verarbeitet Chunks und erstellt Embeddings mit Optimierungen für große Dokumente"""
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
        with self.lock:
            try:
                if not self.model:
                    logger.warning("Embedding-Modell nicht initialisiert")
                    return False

<<<<<<< HEAD
                # Advanced preprocessing
                logger.info(f"🔧 Starte Advanced Preprocessing für {len(chunks)} Chunks")
                preprocessed_chunks = self._advanced_preprocess_chunks(chunks)
                
                if self._load_from_cache(preprocessed_chunks):
                    return True

                logger.info(f"🧮 Erstelle Embeddings für {len(preprocessed_chunks)} preprocessed Chunks")
                self.chunks = preprocessed_chunks

                # Dynamische Batch-Größe basierend auf verfügbarem Speicher
                max_chunks_per_batch = self._calculate_optimal_batch_size()
                
                if len(preprocessed_chunks) > max_chunks_per_batch:
                    logger.info(f"Verarbeite {len(preprocessed_chunks)} Chunks in Teilmengen von {max_chunks_per_batch}")
                    
                    # Speicher für alle verarbeiteten Embeddings
                    all_embeddings = []
                    
                    # Verarbeite Chunks in Teilmengen
                    for i in range(0, len(preprocessed_chunks), max_chunks_per_batch):
                        batch_end = min(i + max_chunks_per_batch, len(preprocessed_chunks))
                        batch_chunks = preprocessed_chunks[i:batch_end]
                        
                        logger.info(f"Verarbeite Teilmenge {i//max_chunks_per_batch + 1} "
                                f"({i}-{batch_end} von {len(preprocessed_chunks)} Chunks)")
=======
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
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
                        
                        # Extrahiere und begrenzt Texte
                        batch_texts = []
                        for chunk in batch_chunks:
<<<<<<< HEAD
                            # Text ist bereits normalisiert und auf 1500 Zeichen begrenzt
                            batch_texts.append(chunk['text'])
=======
                            # Begrenze Chunk-Größe auf 1500 Zeichen
                            if len(chunk['text']) > 1500:
                                chunk['text'] = chunk['text'][:1500]
                            batch_texts.append(chunk['text'])
                            processed_chunks.append(chunk)
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
                        
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
<<<<<<< HEAD
                    
                    # Erstelle TF-IDF Matrix für alle Chunks
                    all_texts = [chunk['text'] for chunk in self.chunks]
=======
                    self.chunks = processed_chunks
                    
                    # Erstelle TF-IDF Matrix für alle Chunks
                    all_texts = [chunk['text'] for chunk in processed_chunks]
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
                    
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
<<<<<<< HEAD
                    texts = [chunk['text'] for chunk in preprocessed_chunks]
=======
                    texts = []
                    for chunk in chunks:
                        # Begrenze Chunk-Größe auf 1500 Zeichen
                        if len(chunk['text']) > 1500:
                            chunk['text'] = chunk['text'][:1500]
                        texts.append(chunk['text'])
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
                    
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
<<<<<<< HEAD
                return []
    
    def _advanced_preprocess_chunks(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Phase 1: Advanced preprocessing mit Text-Normalisierung und Qualitätsbewertung"""
        preprocessed = []
        
        for chunk in chunks:
            # Deep copy um Original nicht zu modifizieren
            processed_chunk = chunk.copy()
            
            # Text-Normalisierung
            normalized_text = self._normalize_text(chunk['text'])
            processed_chunk['text'] = normalized_text
            processed_chunk['original_text'] = chunk['text']
            
            # Keyword-Extraktion
            keywords = self._extract_keywords(normalized_text)
            processed_chunk['keywords'] = keywords
            
            # Qualitätsbewertung
            quality_score = self._assess_text_quality(normalized_text)
            processed_chunk['quality_score'] = quality_score
            
            # Nur hochwertige Chunks behalten
            if quality_score >= 0.3:  # Threshold
                preprocessed.append(processed_chunk)
            else:
                logger.debug(f"Chunk mit niedriger Qualität übersprungen: {quality_score:.2f}")
        
        logger.info(f"✨ Preprocessing: {len(chunks)} → {len(preprocessed)} Chunks (gefiltert)")
        return preprocessed
    
    def _normalize_text(self, text: str) -> str:
        """Normalisiert Text für bessere Embedding-Qualität"""
        # Entferne übermäßige Whitespaces
        text = re.sub(r'\s+', ' ', text)
        
        # Entferne Sonderzeichen am Anfang/Ende
        text = text.strip()
        
        # Normalisiere Umlaute (optional, je nach Modell)
        # text = text.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue')
        # text = text.replace('Ä', 'Ae').replace('Ö', 'Oe').replace('Ü', 'Ue')
        
        # Entferne leere Klammern
        text = re.sub(r'\(\s*\)', '', text)
        text = re.sub(r'\[\s*\]', '', text)
        
        # Normalisiere Bindestriche
        text = re.sub(r'\s*-\s*', '-', text)
        
        # Entferne mehrfache Satzzeichen
        text = re.sub(r'([.!?])\1+', r'\1', text)
        
        return text
    
    def _extract_keywords(self, text: str, max_keywords: int = 10) -> List[str]:
        """Extrahiert wichtige Keywords aus dem Text"""
        # Einfache Keyword-Extraktion basierend auf Worthäufigkeit
        words = re.findall(r'\b[a-zA-Zäöüßÿ]{4,}\b', text.lower())
        
        # Filtere Stoppwörter
        german_stopwords = {
            'und', 'oder', 'aber', 'nicht', 'sein', 'haben', 'werden',
            'dies', 'ein', 'eine', 'der', 'die', 'das', 'mit', 'für',
            'auf', 'ist', 'den', 'dem', 'des', 'wie', 'wenn', 'dann',
            'man', 'wir', 'ich', 'sie', 'kann', 'wird', 'durch', 'nach',
            'auch', 'noch', 'nur', 'sehr', 'schon', 'mehr', 'über',
            'diese', 'dieser', 'dieses', 'alle', 'ihrer', 'ihren'
        }
        
        filtered_words = [w for w in words if w not in german_stopwords]
        
        # Zähle Worthäufigkeiten
        from collections import Counter
        word_freq = Counter(filtered_words)
        
        # Gib die häufigsten Keywords zurück
        keywords = [word for word, _ in word_freq.most_common(max_keywords)]
        return keywords
    
    def _assess_text_quality(self, text: str) -> float:
        """Bewertet die Qualität eines Textes (0.0 - 1.0)"""
        if not text or len(text.strip()) < 50:
            return 0.0
        
        # Faktoren für Qualitätsbewertung
        scores = []
        
        # 1. Textlänge (optimal: 200-800 Zeichen)
        length = len(text)
        if 200 <= length <= 800:
            length_score = 1.0
        elif 100 <= length < 200 or 800 < length <= 1200:
            length_score = 0.7
        else:
            length_score = 0.4
        scores.append(length_score)
        
        # 2. Satz-Struktur (enthält vollständige Sätze?)
        sentences = re.split(r'[.!?]+', text)
        valid_sentences = sum(1 for s in sentences if len(s.strip()) > 10)
        sentence_score = min(valid_sentences / 2, 1.0)  # Mindestens 2 Sätze ideal
        scores.append(sentence_score)
        
        # 3. Wort-Vielfalt (Unique words ratio)
        words = text.lower().split()
        if words:
            unique_ratio = len(set(words)) / len(words)
            diversity_score = unique_ratio * 2  # Skaliert auf 0-1
            scores.append(min(diversity_score, 1.0))
        else:
            scores.append(0.0)
        
        # 4. Spezielle Zeichen-Ratio (zu viele Sonderzeichen = schlechte Qualität)
        special_chars = len(re.findall(r'[^a-zA-Z0-9äöüÄÖÜß\s.,!?-]', text))
        special_ratio = special_chars / len(text)
        special_score = 1.0 - min(special_ratio * 5, 1.0)  # Penalty für zu viele Sonderzeichen
        scores.append(special_score)
        
        # Durchschnittlicher Score
        return sum(scores) / len(scores)
    
    def _calculate_optimal_batch_size(self) -> int:
        """Berechnet optimale Batch-Größe basierend auf verfügbarem Speicher"""
        if self.device == "cuda":
            try:
                # GPU-Speicher checken
                free_memory = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)
                # Konservative Schätzung: ~100MB pro Chunk bei BGE-M3
                estimated_chunks = int(free_memory / (100 * 1024 * 1024))
                return max(10, min(estimated_chunks, 100))  # Zwischen 10 und 100
            except:
                return 50  # Fallback für GPU
        else:
            # CPU: Basierend auf RAM
            try:
                import psutil
                available_memory = psutil.virtual_memory().available
                # Konservative Schätzung: ~50MB pro Chunk auf CPU
                estimated_chunks = int(available_memory / (50 * 1024 * 1024))
                return max(20, min(estimated_chunks, 200))  # Zwischen 20 und 200
            except:
                return 100  # Fallback wenn psutil nicht verfügbar
=======
                return []
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
