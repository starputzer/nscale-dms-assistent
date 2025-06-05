"""
Advanced Query Processor für intelligente Query-Verarbeitung
Implementiert Query Understanding, Expansion und Intent-Erkennung
"""
import re
from typing import List, Dict, Any, Tuple, Optional, Set
from dataclasses import dataclass
from enum import Enum
import spacy
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)


class QueryIntent(Enum):
    """Query-Intent-Typen"""
    DEFINITION = "definition"          # Was ist...?
    HOWTO = "howto"                   # Wie kann ich...?
    TROUBLESHOOTING = "troubleshooting"  # Problem/Fehler
    COMPARISON = "comparison"         # Unterschied zwischen...
    LISTING = "listing"               # Liste/Aufzählung
    CONFIGURATION = "configuration"   # Einstellung/Konfiguration
    GENERAL = "general"              # Allgemeine Frage


@dataclass
class ProcessedQuery:
    """Verarbeitete Query mit Metadaten"""
    original_query: str
    normalized_query: str
    intent: QueryIntent
    key_terms: List[str]
    entities: List[Dict[str, str]]
    expanded_terms: List[str]
    context_hints: List[str]
    language: str
    confidence: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'original': self.original_query,
            'normalized': self.normalized_query,
            'intent': self.intent.value,
            'key_terms': self.key_terms,
            'entities': self.entities,
            'expanded_terms': self.expanded_terms,
            'context_hints': self.context_hints,
            'language': self.language,
            'confidence': self.confidence
        }


class AdvancedQueryProcessor:
    """
    Fortgeschrittene Query-Verarbeitung für besseres Retrieval
    """
    
    def __init__(self, language: str = 'de'):
        self.language = language
        self._nlp = None
        self._embedder = None
        
        # Intent-Patterns
        self.intent_patterns = {
            QueryIntent.DEFINITION: [
                r'^was\s+(ist|sind|bedeutet)',
                r'^definition\s+von',
                r'^erkläre',
                r'^beschreibe'
            ],
            QueryIntent.HOWTO: [
                r'^wie\s+(kann|muss|soll)',
                r'^anleitung',
                r'^tutorial',
                r'^schritte\s+für'
            ],
            QueryIntent.TROUBLESHOOTING: [
                r'fehler',
                r'problem',
                r'funktioniert\s+nicht',
                r'fehlt',
                r'kaputt'
            ],
            QueryIntent.COMPARISON: [
                r'unterschied\s+zwischen',
                r'vergleich',
                r'versus|vs\.?',
                r'oder'
            ],
            QueryIntent.LISTING: [
                r'liste\s+(alle|von)',
                r'welche\s+.*\s+gibt\s+es',
                r'zeige\s+(alle|mir)',
                r'aufzählung'
            ],
            QueryIntent.CONFIGURATION: [
                r'(ein|auf)stell(en|ung)',
                r'konfigur',
                r'parameter',
                r'option'
            ]
        }
        
        # Domain-spezifisches Vokabular
        self.domain_synonyms = {
            'akte': ['akte', 'dokument', 'datei', 'record', 'vorgang'],
            'dokument': ['dokument', 'datei', 'file', 'unterlage', 'schriftstück'],
            'workflow': ['workflow', 'prozess', 'ablauf', 'arbeitsablauf', 'geschäftsprozess'],
            'berechtigung': ['berechtigung', 'recht', 'permission', 'zugriff', 'autorisierung'],
            'rolle': ['rolle', 'funktion', 'position', 'benutzerrolle', 'role'],
            'suche': ['suche', 'search', 'finden', 'durchsuchen', 'retrieval'],
            'metadaten': ['metadaten', 'metadata', 'eigenschaften', 'attribute', 'kennzeichen'],
            'version': ['version', 'versionierung', 'revision', 'änderung', 'historie'],
            'archiv': ['archiv', 'archivierung', 'aufbewahrung', 'speicherung', 'ablage'],
            'index': ['index', 'verzeichnis', 'register', 'katalog', 'suchindex']
        }
        
        # Kontext-Hinweise für besseres Retrieval
        self.context_patterns = {
            'admin': ['administration', 'verwaltung', 'konfiguration', 'einstellungen'],
            'user': ['benutzer', 'anwender', 'nutzer', 'user'],
            'system': ['system', 'installation', 'anforderungen', 'voraussetzungen'],
            'security': ['sicherheit', 'datenschutz', 'verschlüsselung', 'authentifizierung'],
            'integration': ['integration', 'schnittstelle', 'api', 'anbindung']
        }
        
        # Query-Reformulierungs-Templates
        self.reformulation_templates = {
            QueryIntent.DEFINITION: [
                "{term} definition",
                "{term} bedeutung",
                "was ist {term}",
                "{term} erklärung"
            ],
            QueryIntent.HOWTO: [
                "anleitung {action}",
                "schritte {action}",
                "{action} tutorial",
                "wie {action}"
            ],
            QueryIntent.TROUBLESHOOTING: [
                "{problem} lösung",
                "{problem} beheben",
                "fehler {problem}",
                "{problem} fehlerbehebung"
            ]
        }
    
    @property
    def nlp(self):
        """Lazy Loading des Spacy-Modells"""
        if self._nlp is None:
            try:
                self._nlp = spacy.load("de_core_news_md")
            except:
                logger.warning("Deutsches Spacy-Modell nicht gefunden")
                self._nlp = spacy.load("en_core_web_md")
        return self._nlp
    
    @property
    def embedder(self):
        """Lazy Loading des Embedding-Modells"""
        if self._embedder is None:
            self._embedder = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        return self._embedder
    
    def process_query(self, query: str) -> ProcessedQuery:
        """
        Hauptmethode für Query-Processing
        """
        # 1. Basis-Normalisierung
        normalized = self._normalize_query(query)
        
        # 2. Intent-Erkennung
        intent, confidence = self._detect_intent(normalized)
        
        # 3. NLP-Analyse
        doc = self.nlp(normalized)
        
        # 4. Key Terms extrahieren
        key_terms = self._extract_key_terms(doc)
        
        # 5. Entities erkennen
        entities = self._extract_entities(doc)
        
        # 6. Query Expansion
        expanded_terms = self._expand_query(key_terms, intent)
        
        # 7. Kontext-Hinweise
        context_hints = self._extract_context_hints(normalized)
        
        # 8. Sprache erkennen
        language = self._detect_language(normalized)
        
        return ProcessedQuery(
            original_query=query,
            normalized_query=normalized,
            intent=intent,
            key_terms=key_terms,
            entities=entities,
            expanded_terms=expanded_terms,
            context_hints=context_hints,
            language=language,
            confidence=confidence
        )
    
    def _normalize_query(self, query: str) -> str:
        """Normalisiert die Query"""
        # Lowercase
        normalized = query.lower().strip()
        
        # Entferne mehrfache Leerzeichen
        normalized = re.sub(r'\s+', ' ', normalized)
        
        # Entferne Satzzeichen am Ende
        normalized = re.sub(r'[.!?]+$', '', normalized)
        
        # Standardisiere Umlaute (optional)
        replacements = {
            'ä': 'ae',
            'ö': 'oe', 
            'ü': 'ue',
            'ß': 'ss'
        }
        # Behalte Umlaute für besseres Matching
        
        return normalized
    
    def _detect_intent(self, query: str) -> Tuple[QueryIntent, float]:
        """Erkennt Query-Intent"""
        query_lower = query.lower()
        
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, query_lower):
                    return intent, 0.9
        
        # Fallback: Verwende Keyword-Matching
        if any(word in query_lower for word in ['was', 'wer', 'welche']):
            return QueryIntent.DEFINITION, 0.6
        elif any(word in query_lower for word in ['wie', 'anleitung']):
            return QueryIntent.HOWTO, 0.6
        
        return QueryIntent.GENERAL, 0.5
    
    def _extract_key_terms(self, doc) -> List[str]:
        """Extrahiert wichtige Terme"""
        key_terms = []
        
        # Nomen und Eigennamen
        for token in doc:
            if token.pos_ in ['NOUN', 'PROPN'] and not token.is_stop:
                key_terms.append(token.lemma_)
        
        # Verb-Phrasen für Aktionen
        for token in doc:
            if token.pos_ == 'VERB' and not token.is_stop:
                # Füge Verb mit direktem Objekt hinzu
                if token.dep_ == 'ROOT':
                    phrase_parts = [token.lemma_]
                    for child in token.children:
                        if child.dep_ in ['dobj', 'attr']:
                            phrase_parts.append(child.lemma_)
                    if len(phrase_parts) > 1:
                        key_terms.append(' '.join(phrase_parts))
        
        # Deduplizieren
        return list(dict.fromkeys(key_terms))
    
    def _extract_entities(self, doc) -> List[Dict[str, str]]:
        """Extrahiert Named Entities"""
        entities = []
        
        for ent in doc.ents:
            entities.append({
                'text': ent.text,
                'label': ent.label_,
                'start': ent.start_char,
                'end': ent.end_char
            })
        
        # Domain-spezifische Entities
        text_lower = doc.text.lower()
        for term in ['nscale', 'digitale akte', 'ecm', 'dms']:
            if term in text_lower:
                entities.append({
                    'text': term,
                    'label': 'PRODUCT',
                    'start': text_lower.find(term),
                    'end': text_lower.find(term) + len(term)
                })
        
        return entities
    
    def _expand_query(self, key_terms: List[str], intent: QueryIntent) -> List[str]:
        """Erweitert Query mit Synonymen und verwandten Begriffen"""
        expanded = set()
        
        # Synonym-Expansion
        for term in key_terms:
            term_lower = term.lower()
            
            # Direkte Synonyme
            for base_term, synonyms in self.domain_synonyms.items():
                if term_lower == base_term or term_lower in synonyms:
                    expanded.update(synonyms)
                    break
            
            # Teilwort-Matching
            for base_term, synonyms in self.domain_synonyms.items():
                if term_lower in base_term or base_term in term_lower:
                    expanded.update(synonyms[:3])  # Nur Top-3 für Teilmatches
        
        # Intent-basierte Expansion
        if intent == QueryIntent.HOWTO:
            expanded.update(['anleitung', 'tutorial', 'schritte'])
        elif intent == QueryIntent.TROUBLESHOOTING:
            expanded.update(['lösung', 'problem', 'fehler', 'beheben'])
        elif intent == QueryIntent.CONFIGURATION:
            expanded.update(['einstellung', 'konfiguration', 'parameter'])
        
        # Entferne Original-Terme
        expanded = expanded - set(key_terms)
        
        return list(expanded)
    
    def _extract_context_hints(self, query: str) -> List[str]:
        """Extrahiert Kontext-Hinweise"""
        hints = []
        query_lower = query.lower()
        
        for context, keywords in self.context_patterns.items():
            if any(keyword in query_lower for keyword in keywords):
                hints.append(context)
        
        return hints
    
    def _detect_language(self, text: str) -> str:
        """Erkennt Sprache der Query"""
        # Einfache Heuristik für DE/EN
        german_words = ['der', 'die', 'das', 'und', 'ist', 'wie', 'was', 'kann']
        english_words = ['the', 'is', 'how', 'what', 'can', 'and', 'or', 'for']
        
        text_lower = text.lower()
        german_count = sum(1 for word in german_words if word in text_lower.split())
        english_count = sum(1 for word in english_words if word in text_lower.split())
        
        return 'de' if german_count >= english_count else 'en'
    
    def generate_reformulations(self, processed_query: ProcessedQuery) -> List[str]:
        """
        Generiert alternative Query-Formulierungen
        """
        reformulations = []
        
        # Template-basierte Reformulierung
        if processed_query.intent in self.reformulation_templates:
            templates = self.reformulation_templates[processed_query.intent]
            
            for template in templates:
                if processed_query.key_terms:
                    # Verwende ersten Key Term
                    reformulation = template.format(
                        term=processed_query.key_terms[0],
                        action=' '.join(processed_query.key_terms),
                        problem=' '.join(processed_query.key_terms)
                    )
                    reformulations.append(reformulation)
        
        # Synonym-basierte Reformulierung
        for i, term in enumerate(processed_query.key_terms[:2]):  # Nur erste 2 Terme
            # Erstelle Variante mit expandierten Termen
            variant_terms = processed_query.key_terms.copy()
            if processed_query.expanded_terms:
                variant_terms[i] = processed_query.expanded_terms[0]
                reformulations.append(' '.join(variant_terms))
        
        # Entferne Duplikate
        reformulations = list(dict.fromkeys(reformulations))
        
        # Begrenze auf 5 Reformulierungen
        return reformulations[:5]
    
    def calculate_query_similarity(self, query1: str, query2: str) -> float:
        """
        Berechnet semantische Ähnlichkeit zwischen Queries
        """
        # Embeddings generieren
        embeddings = self.embedder.encode([query1, query2])
        
        # Cosine Similarity
        similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        
        return float(similarity)
    
    def extract_filters(self, processed_query: ProcessedQuery) -> Dict[str, Any]:
        """
        Extrahiert Filter-Kriterien aus der Query
        """
        filters = {}
        
        # Dokumenttyp-Filter
        doc_type_keywords = {
            'handbuch': 'manual',
            'anleitung': 'guide',
            'tutorial': 'tutorial',
            'referenz': 'reference',
            'beispiel': 'example'
        }
        
        query_lower = processed_query.normalized_query.lower()
        for keyword, doc_type in doc_type_keywords.items():
            if keyword in query_lower:
                filters['document_type'] = doc_type
                break
        
        # Zeitliche Filter
        time_patterns = {
            'aktuell': {'recency': 'recent'},
            'neu': {'recency': 'new'},
            'version (\d+)': {'version': r'\1'}
        }
        
        for pattern, filter_dict in time_patterns.items():
            match = re.search(pattern, query_lower)
            if match:
                if 'version' in filter_dict:
                    filters['version'] = match.group(1)
                else:
                    filters.update(filter_dict)
        
        # Kontext-basierte Filter
        if 'admin' in processed_query.context_hints:
            filters['scope'] = 'administration'
        elif 'user' in processed_query.context_hints:
            filters['scope'] = 'end_user'
        
        return filters
    
    def get_query_embedding(self, query: str) -> np.ndarray:
        """
        Generiert optimiertes Query-Embedding
        """
        # Verarbeite Query
        processed = self.process_query(query)
        
        # Kombiniere Original + Expanded Terms
        enhanced_query = query
        if processed.expanded_terms:
            enhanced_query += " " + " ".join(processed.expanded_terms[:3])
        
        # Generiere Embedding
        embedding = self.embedder.encode(enhanced_query)
        
        return embedding


# Beispiel-Verwendung und Tests
def test_query_processor():
    """Test-Funktion für Query Processor"""
    processor = AdvancedQueryProcessor()
    
    test_queries = [
        "Was ist nscale?",
        "Wie kann ich Dokumente archivieren?",
        "Fehler beim Login beheben",
        "Unterschied zwischen Akte und Dokument",
        "Liste alle Berechtigungen auf",
        "Workflow konfigurieren in der Admin-Oberfläche"
    ]
    
    print("Advanced Query Processing Tests\n" + "="*50)
    
    for query in test_queries:
        processed = processor.process_query(query)
        
        print(f"\nOriginal Query: {query}")
        print(f"Intent: {processed.intent.value} (Confidence: {processed.confidence:.2f})")
        print(f"Key Terms: {', '.join(processed.key_terms)}")
        print(f"Expanded Terms: {', '.join(processed.expanded_terms[:5])}")
        
        if processed.entities:
            print(f"Entities: {', '.join([e['text'] for e in processed.entities])}")
        
        if processed.context_hints:
            print(f"Context: {', '.join(processed.context_hints)}")
        
        # Reformulierungen
        reformulations = processor.generate_reformulations(processed)
        if reformulations:
            print(f"Reformulations: {'; '.join(reformulations[:3])}")
        
        # Filter
        filters = processor.extract_filters(processed)
        if filters:
            print(f"Filters: {filters}")
    
    # Similarity Test
    print("\n\nQuery Similarity Tests\n" + "="*50)
    similarity_pairs = [
        ("Wie erstelle ich eine Akte?", "Wie kann ich eine neue Akte anlegen?"),
        ("Was sind Berechtigungen?", "Welche Rollen gibt es?"),
        ("Dokument suchen", "Datei finden")
    ]
    
    for q1, q2 in similarity_pairs:
        similarity = processor.calculate_query_similarity(q1, q2)
        print(f"\n'{q1}' <-> '{q2}'")
        print(f"Similarity: {similarity:.3f}")


if __name__ == "__main__":
    test_query_processor()