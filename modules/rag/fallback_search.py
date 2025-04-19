import re
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np

class FallbackSearch:
    """Einfache Textsuche als Fallback wenn LLM nicht antwortet"""
    
    def __init__(self):
        self.vectorizer = None
        self.text_chunks = []
        self.initialized = False
    
    def initialize(self, chunks: List[Dict[str, Any]]) -> bool:
        """Initialisiert die Suchmaschine mit Chunks"""
        try:
            self.text_chunks = chunks
            texts = [chunk['text'] for chunk in chunks]
            
            # Erstelle TF-IDF Vektorizer
            self.vectorizer = TfidfVectorizer(lowercase=True)
            self.vectorizer.fit(texts)
            
            self.initialized = True
            return True
        except Exception as e:
            print(f"Fehler bei Initialisierung der Fallback-Suche: {e}")
            return False
    
    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Führt eine einfache Suche durch"""
        if not self.initialized:
            return []
        
        try:
            # Normalisiere Query
            query = self._preprocess_text(query)
            
            # TF-IDF Transformation
            query_vec = self.vectorizer.transform([query])
            
            # Berechne Cosinus-Ähnlichkeit
            if len(self.text_chunks) > 0:
                document_vectors = self.vectorizer.transform([chunk['text'] for chunk in self.text_chunks])
                similarities = (query_vec @ document_vectors.T).toarray().flatten()
                
                # Sortiere nach Ähnlichkeit
                top_indices = similarities.argsort()[-top_k:][::-1]
                
                results = []
                for idx in top_indices:
                    if similarities[idx] > 0:
                        chunk = self.text_chunks[idx].copy()
                        chunk['score'] = float(similarities[idx])
                        results.append(chunk)
                
                return results
            return []
            
        except Exception as e:
            print(f"Fehler bei Fallback-Suche: {e}")
            return []
    
    def _preprocess_text(self, text: str) -> str:
        """Bereinigt Text für die Suche"""
        text = re.sub(r'\s+', ' ', text)
        return text.strip().lower()
    
    def generate_answer(self, question: str, chunks: List[Dict[str, Any]]) -> str:
        """Erstellt eine einfache Antwort basierend auf gefundenen Chunks"""
        if not chunks:
            return "Leider konnte ich keine relevanten Informationen finden. Bitte formulieren Sie Ihre Frage anders oder kontaktieren Sie den Support."
        
        # Extrahiere die relevantesten Textabschnitte
        texts = [f"Aus {chunk['file']}: {chunk['text'][:300]}..." for chunk in chunks]
        
        # Einfache Antwort zusammenstellen
        answer = f"""Aufgrund hoher Systemlast kann ich gerade keine KI-generierte Antwort erstellen. 
Hier sind die relevantesten Informationen zu Ihrer Frage:

{''.join(f'- {text}\n\n' for text in texts)}

Bei weiteren Fragen versuchen Sie bitte, spezifischer zu sein oder kontaktieren Sie den Support."""
        
        return answer