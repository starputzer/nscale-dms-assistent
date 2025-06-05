"""Phase 2.3: Cross-Encoder Reranking für verbesserte Relevanz"""
import torch
import numpy as np
from typing import List, Dict, Any, Tuple
from sentence_transformers import CrossEncoder
import logging

from ..core.config import Config
from ..core.logging import LogManager

logger = LogManager.setup_logging()

class ReRanker:
    """Cross-Encoder basiertes Reranking für bessere Relevanz-Sortierung"""
    
    def __init__(self):
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.initialized = False
        
    def initialize(self) -> bool:
        """Initialisiert das Cross-Encoder Modell"""
        try:
            logger.info("🎯 Initialisiere Cross-Encoder für Reranking...")
            
            # Verwende deutsches Cross-Encoder Modell oder multilingual
            model_name = 'cross-encoder/ms-marco-MiniLM-L-6-v2'  # Multilingual
            
            self.model = CrossEncoder(
                model_name,
                device=self.device,
                max_length=512
            )
            
            self.initialized = True
            logger.info(f"✅ Cross-Encoder {model_name} erfolgreich geladen auf {self.device}")
            return True
            
        except Exception as e:
            logger.error(f"Fehler beim Laden des Cross-Encoder Modells: {e}")
            # Fallback: Kein Reranking
            self.initialized = False
            return False
    
    def rerank(self, query: str, chunks: List[Dict[str, Any]], 
               top_k: int = None, intent: str = None) -> List[Dict[str, Any]]:
        """
        Phase 2.3: Rerankt Chunks basierend auf Cross-Encoder Scores
        
        Args:
            query: Die Suchanfrage
            chunks: Liste von Chunks mit initialen Scores
            top_k: Anzahl der Top-Ergebnisse
            intent: Query Intent für intent-spezifisches Ranking
            
        Returns:
            Rerankte Liste von Chunks
        """
        if not chunks:
            return []
            
        if not self.initialized:
            logger.warning("Cross-Encoder nicht initialisiert, überspringe Reranking")
            return chunks[:top_k] if top_k else chunks
        
        try:
            logger.info(f"🔄 Reranking {len(chunks)} Chunks für Query: '{query[:50]}...'")
            
            # Bereite Query-Chunk Paare vor
            pairs = []
            for chunk in chunks:
                chunk_text = chunk.get('text', '')
                
                # Intent-spezifische Kontextanreicherung
                if intent == 'procedural' and 'section_title' in chunk:
                    # Füge Section-Info für procedural queries hinzu
                    context_text = f"{chunk['section_title']}: {chunk_text}"
                elif intent == 'troubleshooting' and 'keywords' in chunk:
                    # Betone Keywords für Troubleshooting
                    keywords = ' '.join(chunk.get('keywords', []))
                    context_text = f"Keywords: {keywords}. {chunk_text}"
                else:
                    context_text = chunk_text
                
                pairs.append([query, context_text])
            
            # Berechne Cross-Encoder Scores
            ce_scores = self.model.predict(pairs, show_progress_bar=False)
            
            # Kombiniere mit originalen Scores (Hybrid-Ansatz)
            reranked_chunks = []
            for i, (chunk, ce_score) in enumerate(zip(chunks, ce_scores)):
                original_score = chunk.get('score', 0.5)
                
                # Gewichtete Kombination: 70% Cross-Encoder, 30% Original
                combined_score = 0.7 * float(ce_score) + 0.3 * original_score
                
                # Intent-basierte Score-Adjustments
                if intent:
                    combined_score = self._adjust_score_by_intent(
                        combined_score, chunk, intent
                    )
                
                # Füge Reranking-Info hinzu
                reranked_chunk = chunk.copy()
                reranked_chunk['rerank_score'] = float(ce_score)
                reranked_chunk['combined_score'] = combined_score
                reranked_chunk['original_rank'] = i + 1
                
                reranked_chunks.append(reranked_chunk)
            
            # Sortiere nach kombiniertem Score
            reranked_chunks.sort(key=lambda x: x['combined_score'], reverse=True)
            
            # Füge neue Rang-Info hinzu
            for i, chunk in enumerate(reranked_chunks):
                chunk['new_rank'] = i + 1
                chunk['rank_change'] = chunk['original_rank'] - chunk['new_rank']
            
            # Log Ranking-Änderungen
            significant_changes = [
                c for c in reranked_chunks[:5] 
                if abs(c.get('rank_change', 0)) >= 3
            ]
            if significant_changes:
                logger.info(f"📊 Signifikante Ranking-Änderungen: "
                          f"{len(significant_changes)} Chunks um 3+ Positionen verschoben")
            
            result = reranked_chunks[:top_k] if top_k else reranked_chunks
            
            # Durchschnittliche Score-Verbesserung
            if result:
                avg_ce_score = np.mean([c['rerank_score'] for c in result[:5]])
                avg_original = np.mean([c.get('score', 0.5) for c in result[:5]])
                logger.info(f"📈 Reranking Score-Verbesserung: "
                          f"{avg_original:.3f} → {avg_ce_score:.3f}")
            
            return result
            
        except Exception as e:
            logger.error(f"Fehler beim Reranking: {e}")
            # Fallback: Gib Original-Reihenfolge zurück
            return chunks[:top_k] if top_k else chunks
    
    def _adjust_score_by_intent(self, score: float, chunk: Dict[str, Any], 
                               intent: str) -> float:
        """Passt Scores basierend auf Query Intent an"""
        
        # Procedural: Bevorzuge Chunks mit Schritt-Informationen
        if intent == 'procedural':
            text_lower = chunk.get('text', '').lower()
            if any(word in text_lower for word in ['schritt', 'zuerst', 'dann', 'danach', 'abschließend']):
                score *= 1.2
            if chunk.get('type') == 'section' and 'anleitung' in chunk.get('section_title', '').lower():
                score *= 1.3
                
        # Troubleshooting: Bevorzuge Chunks mit Lösungen
        elif intent == 'troubleshooting':
            text_lower = chunk.get('text', '').lower()
            if any(word in text_lower for word in ['lösung', 'beheben', 'prüfen', 'kontrollieren']):
                score *= 1.25
            if any(word in text_lower for word in ['fehler', 'problem', 'meldung']):
                score *= 1.1
                
        # Navigation: Bevorzuge UI-bezogene Chunks
        elif intent == 'navigation':
            text_lower = chunk.get('text', '').lower()
            if any(word in text_lower for word in ['menü', 'button', 'klicken', 'auswählen', 'öffnen']):
                score *= 1.2
                
        # Listing: Bevorzuge Chunks mit Aufzählungen
        elif intent == 'listing':
            text = chunk.get('text', '')
            # Zähle Aufzählungszeichen
            list_indicators = len(re.findall(r'(?:^|\n)\s*[-•*]|\d+\.', text))
            if list_indicators > 2:
                score *= 1.2
                
        return min(score, 1.0)  # Cap bei 1.0
    
    def batch_rerank(self, queries_chunks: List[Tuple[str, List[Dict[str, Any]]]], 
                    top_k: int = None) -> List[List[Dict[str, Any]]]:
        """Batch-Reranking für mehrere Queries gleichzeitig"""
        if not self.initialized:
            return [chunks[:top_k] if top_k else chunks 
                   for _, chunks in queries_chunks]
        
        try:
            # Sammle alle Query-Chunk Paare
            all_pairs = []
            chunk_indices = []
            
            for query_idx, (query, chunks) in enumerate(queries_chunks):
                for chunk_idx, chunk in enumerate(chunks):
                    all_pairs.append([query, chunk['text']])
                    chunk_indices.append((query_idx, chunk_idx))
            
            # Batch-Prediction
            if all_pairs:
                all_scores = self.model.predict(all_pairs, show_progress_bar=False)
                
                # Reorganisiere Scores zurück zu Queries
                results = [[] for _ in queries_chunks]
                
                for (query_idx, chunk_idx), score in zip(chunk_indices, all_scores):
                    chunk = queries_chunks[query_idx][1][chunk_idx].copy()
                    chunk['rerank_score'] = float(score)
                    results[query_idx].append(chunk)
                
                # Sortiere jede Query-Result-Liste
                for i in range(len(results)):
                    results[i].sort(key=lambda x: x['rerank_score'], reverse=True)
                    if top_k:
                        results[i] = results[i][:top_k]
                
                return results
            
            return [[] for _ in queries_chunks]
            
        except Exception as e:
            logger.error(f"Fehler beim Batch-Reranking: {e}")
            return [chunks[:top_k] if top_k else chunks 
                   for _, chunks in queries_chunks]