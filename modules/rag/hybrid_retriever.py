"""
Hybrid Retrieval System für optimierte RAG-Performance
Kombiniert Dense (Semantic) und Sparse (Keyword) Retrieval mit Reranking
"""
import asyncio
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from dataclasses import dataclass
import faiss
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer, CrossEncoder
import torch
from sklearn.feature_extraction.text import TfidfVectorizer
import logging
from collections import defaultdict
import pickle
import os

logger = logging.getLogger(__name__)


@dataclass
class RetrievalResult:
    """Struktur für Retrieval-Ergebnisse"""
    chunk_id: int
    text: str
    score: float
    metadata: Dict[str, Any]
    retrieval_method: str  # 'dense', 'sparse', 'hybrid'
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'chunk_id': self.chunk_id,
            'text': self.text,
            'score': self.score,
            'metadata': self.metadata,
            'method': self.retrieval_method
        }


class HybridRetriever:
    """
    Hybrid-Retrieval-System mit Dense + Sparse Search und Reranking
    """
    
    def __init__(self,
                 embedding_model: str = 'BAAI/bge-m3',
                 reranker_model: str = 'BAAI/bge-reranker-base',
                 index_path: str = 'cache/hybrid_index',
                 device: str = None):
        
        self.embedding_model_name = embedding_model
        self.reranker_model_name = reranker_model
        self.index_path = index_path
        
        # Device-Auswahl
        if device is None:
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        else:
            self.device = device
            
        logger.info(f"HybridRetriever initialisiert mit Device: {self.device}")
        
        # Lazy Loading der Modelle
        self._embedding_model = None
        self._reranker = None
        
        # Index-Strukturen
        self.dense_index = None
        self.sparse_index = None
        self.documents = []
        self.document_metadata = []
        
        # Konfiguration
        self.dense_weight = 0.6
        self.sparse_weight = 0.4
        
        # Cache für Query-Expansion
        self.expansion_cache = {}
        
        # Index-Verzeichnis erstellen
        os.makedirs(self.index_path, exist_ok=True)
    
    @property
    def embedding_model(self):
        """Lazy Loading des Embedding-Modells"""
        if self._embedding_model is None:
            logger.info(f"Lade Embedding-Modell: {self.embedding_model_name}")
            self._embedding_model = SentenceTransformer(
                self.embedding_model_name,
                device=self.device
            )
        return self._embedding_model
    
    @property
    def reranker(self):
        """Lazy Loading des Reranker-Modells"""
        if self._reranker is None:
            logger.info(f"Lade Reranker-Modell: {self.reranker_model_name}")
            self._reranker = CrossEncoder(
                self.reranker_model_name,
                device=self.device
            )
        return self._reranker
    
    async def index_documents(self, 
                            documents: List[Dict[str, Any]], 
                            batch_size: int = 32) -> bool:
        """
        Indiziert Dokumente für Dense und Sparse Retrieval
        """
        try:
            logger.info(f"Starte Indizierung von {len(documents)} Dokumenten")
            
            # Extrahiere Texte und Metadaten
            texts = []
            metadata = []
            
            for doc in documents:
                texts.append(doc.get('text', ''))
                metadata.append(doc.get('metadata', {}))
            
            self.documents = texts
            self.document_metadata = metadata
            
            # 1. Dense Index (FAISS) erstellen
            await self._build_dense_index(texts, batch_size)
            
            # 2. Sparse Index (BM25) erstellen
            self._build_sparse_index(texts)
            
            # 3. Index speichern
            self._save_index()
            
            logger.info("Indizierung erfolgreich abgeschlossen")
            return True
            
        except Exception as e:
            logger.error(f"Fehler bei der Indizierung: {e}")
            return False
    
    async def _build_dense_index(self, texts: List[str], batch_size: int):
        """Erstellt FAISS Dense Index"""
        logger.info("Erstelle Dense Index mit FAISS")
        
        # Embeddings in Batches generieren
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = self.embedding_model.encode(
                batch,
                convert_to_tensor=True,
                show_progress_bar=False
            )
            embeddings.append(batch_embeddings.cpu().numpy())
        
        # Kombiniere alle Embeddings
        all_embeddings = np.vstack(embeddings)
        
        # Normalisiere Embeddings für Cosine-Similarity
        faiss.normalize_L2(all_embeddings)
        
        # Erstelle FAISS Index
        dimension = all_embeddings.shape[1]
        
        # Verwende IVF Index für große Datensätze
        if len(texts) > 10000:
            nlist = int(np.sqrt(len(texts)))  # Anzahl der Voronoi-Zellen
            quantizer = faiss.IndexFlatIP(dimension)
            self.dense_index = faiss.IndexIVFFlat(quantizer, dimension, nlist)
            self.dense_index.train(all_embeddings)
        else:
            # Für kleinere Datensätze: Flat Index
            self.dense_index = faiss.IndexFlatIP(dimension)
        
        # Füge Vektoren zum Index hinzu
        self.dense_index.add(all_embeddings)
        
        logger.info(f"Dense Index erstellt mit {self.dense_index.ntotal} Vektoren")
    
    def _build_sparse_index(self, texts: List[str]):
        """Erstellt BM25 Sparse Index"""
        logger.info("Erstelle Sparse Index mit BM25")
        
        # Tokenisierung für BM25
        tokenized_texts = [self._tokenize(text) for text in texts]
        
        # BM25 Index erstellen
        self.sparse_index = BM25Okapi(tokenized_texts)
        
        logger.info("Sparse Index erfolgreich erstellt")
    
    def _tokenize(self, text: str) -> List[str]:
        """Einfache Tokenisierung für BM25"""
        # Lowercase und Split
        tokens = text.lower().split()
        # Entferne Satzzeichen am Anfang/Ende
        tokens = [token.strip('.,!?;:"') for token in tokens]
        # Filtere leere Tokens
        return [token for token in tokens if token]
    
    async def search(self,
                    query: str,
                    k: int = 10,
                    use_reranking: bool = True,
                    filters: Optional[Dict[str, Any]] = None) -> List[RetrievalResult]:
        """
        Hybrid-Suche mit optionalem Reranking
        """
        try:
            # 1. Query Expansion
            expanded_query = await self._expand_query(query)
            
            # 2. Dense Retrieval
            dense_results = await self._dense_search(expanded_query, k * 2)
            
            # 3. Sparse Retrieval
            sparse_results = self._sparse_search(expanded_query, k * 2)
            
            # 4. Result Fusion
            fused_results = self._reciprocal_rank_fusion(
                dense_results, 
                sparse_results,
                k * 2
            )
            
            # 5. Filtering (wenn angegeben)
            if filters:
                fused_results = self._apply_filters(fused_results, filters)
            
            # 6. Reranking (optional)
            if use_reranking and len(fused_results) > 0:
                final_results = await self._rerank_results(query, fused_results[:k*2])
            else:
                final_results = fused_results
            
            # 7. Top-K zurückgeben
            return final_results[:k]
            
        except Exception as e:
            logger.error(f"Fehler bei der Hybrid-Suche: {e}")
            return []
    
    async def _expand_query(self, query: str) -> str:
        """
        Query-Expansion für bessere Recall
        """
        # Cache-Check
        if query in self.expansion_cache:
            return self.expansion_cache[query]
        
        expanded = query
        
        # Einfache Synonym-Expansion für häufige Begriffe
        synonyms = {
            'akte': 'akte dokument datei',
            'berechtigungen': 'berechtigungen rechte zugriff permissions rollen',
            'workflow': 'workflow prozess ablauf',
            'suche': 'suche search durchsuchen finden',
            'installation': 'installation setup einrichtung installieren'
        }
        
        query_lower = query.lower()
        for term, expansion in synonyms.items():
            if term in query_lower:
                expanded = f"{query} {expansion}"
        
        # Cache speichern
        self.expansion_cache[query] = expanded
        
        return expanded
    
    async def _dense_search(self, query: str, k: int) -> List[Tuple[int, float]]:
        """Dense (Semantic) Search mit FAISS"""
        if self.dense_index is None:
            logger.warning("Dense Index nicht initialisiert")
            return []
        
        # Query-Embedding
        query_embedding = self.embedding_model.encode(
            [query],
            convert_to_tensor=True,
            show_progress_bar=False
        )
        query_embedding = query_embedding.cpu().numpy()
        faiss.normalize_L2(query_embedding)
        
        # Suche
        scores, indices = self.dense_index.search(query_embedding, k)
        
        # Ergebnisse formatieren
        results = []
        for idx, score in zip(indices[0], scores[0]):
            if idx != -1:  # FAISS gibt -1 für nicht gefundene Ergebnisse
                results.append((int(idx), float(score)))
        
        return results
    
    def _sparse_search(self, query: str, k: int) -> List[Tuple[int, float]]:
        """Sparse (Keyword) Search mit BM25"""
        if self.sparse_index is None:
            logger.warning("Sparse Index nicht initialisiert")
            return []
        
        # Tokenisiere Query
        query_tokens = self._tokenize(query)
        
        # BM25 Scores
        scores = self.sparse_index.get_scores(query_tokens)
        
        # Top-K Indizes
        top_indices = np.argsort(scores)[-k:][::-1]
        
        # Ergebnisse formatieren
        results = []
        for idx in top_indices:
            if scores[idx] > 0:  # Nur positive Scores
                results.append((int(idx), float(scores[idx])))
        
        return results
    
    def _reciprocal_rank_fusion(self,
                               dense_results: List[Tuple[int, float]],
                               sparse_results: List[Tuple[int, float]],
                               k: int) -> List[RetrievalResult]:
        """
        Reciprocal Rank Fusion für Result-Kombination
        """
        # RRF-Parameter
        k_param = 60  # Standard RRF-Parameter
        
        # Berechne RRF-Scores
        rrf_scores = defaultdict(float)
        
        # Dense Results
        for rank, (idx, score) in enumerate(dense_results):
            rrf_scores[idx] += self.dense_weight / (k_param + rank + 1)
        
        # Sparse Results
        for rank, (idx, score) in enumerate(sparse_results):
            rrf_scores[idx] += self.sparse_weight / (k_param + rank + 1)
        
        # Sortiere nach RRF-Score
        sorted_indices = sorted(rrf_scores.items(), 
                              key=lambda x: x[1], 
                              reverse=True)
        
        # Erstelle RetrievalResult Objekte
        results = []
        for idx, rrf_score in sorted_indices[:k]:
            if idx < len(self.documents):
                results.append(RetrievalResult(
                    chunk_id=idx,
                    text=self.documents[idx],
                    score=rrf_score,
                    metadata=self.document_metadata[idx],
                    retrieval_method='hybrid'
                ))
        
        return results
    
    async def _rerank_results(self,
                            query: str,
                            results: List[RetrievalResult]) -> List[RetrievalResult]:
        """
        Cross-Encoder Reranking für finale Sortierung
        """
        if not results:
            return results
        
        logger.info(f"Reranking {len(results)} Ergebnisse")
        
        # Erstelle Query-Document Paare
        pairs = [[query, result.text] for result in results]
        
        # Reranking-Scores
        rerank_scores = self.reranker.predict(pairs)
        
        # Sortiere Ergebnisse nach Rerank-Score
        sorted_indices = np.argsort(rerank_scores)[::-1]
        
        # Aktualisiere Scores und sortiere
        reranked_results = []
        for idx in sorted_indices:
            result = results[idx]
            result.score = float(rerank_scores[idx])
            reranked_results.append(result)
        
        return reranked_results
    
    def _apply_filters(self,
                      results: List[RetrievalResult],
                      filters: Dict[str, Any]) -> List[RetrievalResult]:
        """
        Wendet Filter auf Ergebnisse an
        """
        filtered_results = []
        
        for result in results:
            include = True
            
            # Prüfe jeden Filter
            for key, value in filters.items():
                if key in result.metadata:
                    if isinstance(value, list):
                        # Filter ist eine Liste von erlaubten Werten
                        if result.metadata[key] not in value:
                            include = False
                            break
                    else:
                        # Direkter Vergleich
                        if result.metadata[key] != value:
                            include = False
                            break
            
            if include:
                filtered_results.append(result)
        
        return filtered_results
    
    def _save_index(self):
        """Speichert Index auf Disk"""
        try:
            # Dense Index
            if self.dense_index is not None:
                faiss.write_index(
                    self.dense_index, 
                    os.path.join(self.index_path, 'dense.index')
                )
            
            # Sparse Index und Dokumente
            with open(os.path.join(self.index_path, 'sparse_data.pkl'), 'wb') as f:
                pickle.dump({
                    'documents': self.documents,
                    'metadata': self.document_metadata,
                    'sparse_index': self.sparse_index
                }, f)
            
            logger.info("Index erfolgreich gespeichert")
            
        except Exception as e:
            logger.error(f"Fehler beim Speichern des Index: {e}")
    
    def load_index(self) -> bool:
        """Lädt Index von Disk"""
        try:
            # Dense Index
            dense_path = os.path.join(self.index_path, 'dense.index')
            if os.path.exists(dense_path):
                self.dense_index = faiss.read_index(dense_path)
                logger.info("Dense Index geladen")
            
            # Sparse Index und Dokumente
            sparse_path = os.path.join(self.index_path, 'sparse_data.pkl')
            if os.path.exists(sparse_path):
                with open(sparse_path, 'rb') as f:
                    data = pickle.load(f)
                    self.documents = data['documents']
                    self.document_metadata = data['metadata']
                    self.sparse_index = data['sparse_index']
                logger.info("Sparse Index und Dokumente geladen")
            
            return True
            
        except Exception as e:
            logger.error(f"Fehler beim Laden des Index: {e}")
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """Gibt Statistiken über den Index zurück"""
        stats = {
            'total_documents': len(self.documents),
            'dense_index_size': self.dense_index.ntotal if self.dense_index else 0,
            'device': self.device,
            'embedding_model': self.embedding_model_name,
            'reranker_model': self.reranker_model_name,
            'dense_weight': self.dense_weight,
            'sparse_weight': self.sparse_weight
        }
        
        # Memory-Statistiken
        if self.dense_index:
            stats['dense_index_memory_mb'] = self.dense_index.ntotal * 768 * 4 / 1024 / 1024
        
        return stats


# Test-Funktion
async def test_hybrid_retriever():
    """Test-Funktion für den Hybrid Retriever"""
    
    # Test-Dokumente
    test_docs = [
        {
            'text': 'nscale ist ein Enterprise Content Management System für die Dokumentenverwaltung.',
            'metadata': {'source': 'manual.md', 'type': 'definition'}
        },
        {
            'text': 'Die Installation von nscale erfolgt über den Installer. Systemvoraussetzungen beachten.',
            'metadata': {'source': 'install.md', 'type': 'guide'}
        },
        {
            'text': 'Berechtigungen und Rollen können im Admin-Bereich konfiguriert werden.',
            'metadata': {'source': 'admin.md', 'type': 'reference'}
        },
        {
            'text': 'Die Suchfunktion ermöglicht Volltext- und Metadatensuche in allen Dokumenten.',
            'metadata': {'source': 'search.md', 'type': 'feature'}
        }
    ]
    
    # Retriever initialisieren
    retriever = HybridRetriever()
    
    # Dokumente indizieren
    await retriever.index_documents(test_docs)
    
    # Test-Queries
    queries = [
        "Was ist nscale?",
        "Wie installiere ich nscale?",
        "Berechtigungen konfigurieren"
    ]
    
    for query in queries:
        print(f"\nQuery: {query}")
        results = await retriever.search(query, k=3)
        
        for i, result in enumerate(results):
            print(f"\n  Ergebnis {i+1}:")
            print(f"    Score: {result.score:.3f}")
            print(f"    Methode: {result.retrieval_method}")
            print(f"    Text: {result.text[:100]}...")
            print(f"    Quelle: {result.metadata.get('source', 'unknown')}")


if __name__ == "__main__":
    # Test ausführen
    asyncio.run(test_hybrid_retriever())