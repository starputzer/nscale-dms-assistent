"""
Document Quality Scorer für RAG-Optimierung
Bewertet die Qualität von Dokumenten und Chunks für optimale Retrieval-Performance
"""
import re
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from dataclasses import dataclass
from collections import Counter
import spacy
from textstat import flesch_reading_ease, flesch_kincaid_grade
from langdetect import detect_langs
import logging

logger = logging.getLogger(__name__)


@dataclass
class QualityMetrics:
    """Qualitäts-Metriken für Dokumente/Chunks"""
    readability_score: float          # Lesbarkeits-Score (0-100)
    completeness_score: float         # Vollständigkeits-Score (0-1)
    structure_score: float            # Struktur-Score (0-1)
    information_density: float        # Informationsdichte (0-1)
    language_consistency: float       # Sprachkonsistenz (0-1)
    technical_accuracy: float         # Technische Genauigkeit (0-1)
    overall_score: float             # Gesamt-Score (0-1)
    issues: List[str]                # Gefundene Probleme
    recommendations: List[str]        # Verbesserungsvorschläge
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'readability': round(self.readability_score, 2),
            'completeness': round(self.completeness_score, 3),
            'structure': round(self.structure_score, 3),
            'information_density': round(self.information_density, 3),
            'language_consistency': round(self.language_consistency, 3),
            'technical_accuracy': round(self.technical_accuracy, 3),
            'overall': round(self.overall_score, 3),
            'issues': self.issues,
            'recommendations': self.recommendations
        }


class DocumentQualityScorer:
    """
    Bewertet die Qualität von Dokumenten für RAG-Systeme
    """
    
    def __init__(self, language: str = 'de'):
        self.language = language
        self._nlp = None
        
        # Muster für Qualitätsprüfung
        self.incomplete_patterns = [
            r'\.\.\.$',                    # Unvollständige Sätze
            r'TODO|FIXME|XXX',            # Entwickler-Markierungen
            r'\[.*?\](?!\()',             # Leere Referenzen
            r'siehe\s+$',                 # Unvollständige Verweise
            r'^\s*\*\s*$',                # Leere Listen-Punkte
        ]
        
        self.quality_indicators = {
            'headers': r'^#{1,6}\s+.+$',
            'lists': r'^\s*[-*+]\s+.+$',
            'numbered_lists': r'^\s*\d+\.\s+.+$',
            'code_blocks': r'```[\s\S]*?```',
            'tables': r'\|[^\n]+\|',
            'links': r'\[([^\]]+)\]\(([^)]+)\)',
            'emphasis': r'(\*\*|__).+?\1',
        }
        
        # Technische Begriffe für nscale
        self.technical_terms = {
            'akte', 'dokument', 'workflow', 'metadaten', 'versionierung',
            'berechtigungen', 'rollen', 'suche', 'index', 'archivierung',
            'compliance', 'retention', 'klassifikation', 'signatur', 'ecm'
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
    
    def score_document(self, text: str, metadata: Optional[Dict[str, Any]] = None) -> QualityMetrics:
        """
        Bewertet die Qualität eines gesamten Dokuments
        """
        if not text or len(text.strip()) < 10:
            return QualityMetrics(
                readability_score=0,
                completeness_score=0,
                structure_score=0,
                information_density=0,
                language_consistency=0,
                technical_accuracy=0,
                overall_score=0,
                issues=["Dokument ist leer oder zu kurz"],
                recommendations=["Dokument mit Inhalt füllen"]
            )
        
        metadata = metadata or {}
        
        # Einzelne Scores berechnen
        readability = self._calculate_readability(text)
        completeness = self._calculate_completeness(text)
        structure = self._calculate_structure_score(text)
        density = self._calculate_information_density(text)
        language = self._calculate_language_consistency(text)
        technical = self._calculate_technical_accuracy(text, metadata)
        
        # Issues und Empfehlungen sammeln
        issues = []
        recommendations = []
        
        # Readability Issues
        if readability < 30:
            issues.append("Sehr schwer lesbar")
            recommendations.append("Vereinfachen Sie komplexe Sätze")
        elif readability < 50:
            issues.append("Schwer lesbar")
            recommendations.append("Verwenden Sie kürzere Sätze")
        
        # Completeness Issues
        if completeness < 0.7:
            issues.append("Möglicherweise unvollständiger Inhalt")
            recommendations.append("Überprüfen Sie unvollständige Abschnitte")
        
        # Structure Issues
        if structure < 0.5:
            issues.append("Schwache Dokumentstruktur")
            recommendations.append("Fügen Sie Überschriften und Listen hinzu")
        
        # Information Density Issues
        if density < 0.3:
            issues.append("Geringe Informationsdichte")
            recommendations.append("Fügen Sie mehr fachspezifische Inhalte hinzu")
        elif density > 0.8:
            issues.append("Sehr hohe Informationsdichte")
            recommendations.append("Fügen Sie erklärende Absätze hinzu")
        
        # Language Issues
        if language < 0.8:
            issues.append("Inkonsistente Sprache erkannt")
            recommendations.append("Vereinheitlichen Sie die Sprache")
        
        # Gesamt-Score berechnen (gewichtet)
        overall = (
            0.20 * (readability / 100) +  # Normalisieren auf 0-1
            0.20 * completeness +
            0.20 * structure +
            0.15 * density +
            0.10 * language +
            0.15 * technical
        )
        
        return QualityMetrics(
            readability_score=readability,
            completeness_score=completeness,
            structure_score=structure,
            information_density=density,
            language_consistency=language,
            technical_accuracy=technical,
            overall_score=overall,
            issues=issues,
            recommendations=recommendations
        )
    
    def score_chunk(self, chunk_text: str, context: Optional[str] = None) -> QualityMetrics:
        """
        Bewertet die Qualität eines einzelnen Chunks
        Angepasste Metriken für kleinere Texteinheiten
        """
        if not chunk_text or len(chunk_text.strip()) < 10:
            return QualityMetrics(
                readability_score=0,
                completeness_score=0,
                structure_score=0,
                information_density=0,
                language_consistency=0,
                technical_accuracy=0,
                overall_score=0,
                issues=["Chunk ist leer oder zu kurz"],
                recommendations=["Chunk-Größe erhöhen"]
            )
        
        # Chunk-spezifische Bewertung
        readability = self._calculate_readability(chunk_text)
        completeness = self._calculate_chunk_completeness(chunk_text)
        coherence = self._calculate_chunk_coherence(chunk_text)
        density = self._calculate_information_density(chunk_text)
        
        issues = []
        recommendations = []
        
        # Chunk-spezifische Issues
        if len(chunk_text) < 100:
            issues.append("Chunk möglicherweise zu klein")
            recommendations.append("Erwägen Sie größere Chunk-Größen")
        
        if len(chunk_text) > 1000:
            issues.append("Chunk möglicherweise zu groß")
            recommendations.append("Erwägen Sie kleinere Chunk-Größen")
        
        if completeness < 0.6:
            issues.append("Chunk endet möglicherweise mitten im Satz")
            recommendations.append("Verbessern Sie Chunk-Grenzen")
        
        # Gesamt-Score für Chunks
        overall = (
            0.25 * (readability / 100) +
            0.30 * completeness +
            0.25 * coherence +
            0.20 * density
        )
        
        return QualityMetrics(
            readability_score=readability,
            completeness_score=completeness,
            structure_score=coherence,  # Für Chunks: Kohärenz statt Struktur
            information_density=density,
            language_consistency=1.0,  # Nicht relevant für einzelne Chunks
            technical_accuracy=1.0,    # Nicht bewertbar ohne Kontext
            overall_score=overall,
            issues=issues,
            recommendations=recommendations
        )
    
    def _calculate_readability(self, text: str) -> float:
        """
        Berechnet Lesbarkeits-Score (Flesch Reading Ease für Deutsch)
        """
        try:
            # Flesch Reading Ease (angepasst für Deutsch)
            # 0-30: sehr schwer, 30-50: schwer, 50-60: mittelschwer, 
            # 60-70: mittel, 70-80: mittelleicht, 80-90: leicht, 90-100: sehr leicht
            score = flesch_reading_ease(text)
            
            # Normalisiere auf 0-100 (kann negativ sein)
            return max(0, min(100, score))
            
        except Exception as e:
            logger.warning(f"Readability-Berechnung fehlgeschlagen: {e}")
            return 50.0  # Default mittlere Lesbarkeit
    
    def _calculate_completeness(self, text: str) -> float:
        """
        Bewertet die Vollständigkeit des Dokuments
        """
        issues_found = 0
        total_checks = 0
        
        # Prüfe auf unvollständige Muster
        for pattern in self.incomplete_patterns:
            matches = re.findall(pattern, text, re.MULTILINE | re.IGNORECASE)
            issues_found += len(matches)
            total_checks += 1
        
        # Prüfe auf ausgewogene Klammern/Anführungszeichen
        brackets = {'(': ')', '[': ']', '{': '}'}
        quotes = ['"', "'"]
        
        for open_b, close_b in brackets.items():
            open_count = text.count(open_b)
            close_count = text.count(close_b)
            if open_count != close_count:
                issues_found += abs(open_count - close_count)
            total_checks += 1
        
        for quote in quotes:
            count = text.count(quote)
            if count % 2 != 0:
                issues_found += 1
            total_checks += 1
        
        # Score berechnen
        if total_checks == 0:
            return 1.0
        
        completeness = 1.0 - (issues_found / (total_checks * 5))  # Max 5 Issues pro Check
        return max(0, completeness)
    
    def _calculate_structure_score(self, text: str) -> float:
        """
        Bewertet die Struktur des Dokuments
        """
        structure_elements = 0
        total_weight = 0
        
        # Gewichtete Struktur-Elemente
        weights = {
            'headers': 3.0,
            'lists': 2.0,
            'numbered_lists': 2.0,
            'code_blocks': 1.5,
            'tables': 2.5,
            'links': 1.0,
            'emphasis': 0.5
        }
        
        # Zähle Struktur-Elemente
        for element, pattern in self.quality_indicators.items():
            matches = re.findall(pattern, text, re.MULTILINE)
            if matches:
                weight = weights.get(element, 1.0)
                structure_elements += len(matches) * weight
                total_weight += weight
        
        # Normalisiere basierend auf Textlänge
        text_length = len(text.split())
        expected_elements = text_length / 100  # Erwarte 1 Element pro 100 Wörter
        
        if expected_elements == 0:
            return 0.0
        
        structure_score = min(1.0, structure_elements / (expected_elements * 2))
        return structure_score
    
    def _calculate_information_density(self, text: str) -> float:
        """
        Berechnet die Informationsdichte
        """
        doc = self.nlp(text[:5000])  # Begrenze für Performance
        
        # Zähle verschiedene Wortarten
        nouns = sum(1 for token in doc if token.pos_ == 'NOUN')
        verbs = sum(1 for token in doc if token.pos_ == 'VERB')
        entities = len(doc.ents)
        
        total_tokens = len([token for token in doc if not token.is_punct])
        
        if total_tokens == 0:
            return 0.0
        
        # Informationstragende Wörter
        content_words = nouns + verbs + entities
        density = content_words / total_tokens
        
        # Technische Terme erhöhen die Dichte
        technical_count = sum(1 for token in doc 
                            if token.text.lower() in self.technical_terms)
        technical_bonus = min(0.2, technical_count / total_tokens)
        
        return min(1.0, density + technical_bonus)
    
    def _calculate_language_consistency(self, text: str) -> float:
        """
        Prüft Sprachkonsistenz
        """
        try:
            # Teile Text in Abschnitte
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
            
            if len(paragraphs) < 2:
                return 1.0  # Zu wenig Text für Bewertung
            
            # Erkenne Sprache für jeden Abschnitt
            languages = []
            for para in paragraphs[:10]:  # Maximal 10 Abschnitte prüfen
                if len(para) > 20:  # Mindestlänge für Spracherkennung
                    detected = detect_langs(para)
                    if detected:
                        languages.append(detected[0].lang)
            
            if not languages:
                return 1.0
            
            # Berechne Konsistenz
            language_counts = Counter(languages)
            most_common = language_counts.most_common(1)[0]
            consistency = most_common[1] / len(languages)
            
            return consistency
            
        except Exception as e:
            logger.warning(f"Sprachkonsistenz-Prüfung fehlgeschlagen: {e}")
            return 1.0
    
    def _calculate_technical_accuracy(self, text: str, metadata: Dict[str, Any]) -> float:
        """
        Bewertet technische Genauigkeit (domänenspezifisch)
        """
        score = 0.7  # Basis-Score
        
        # Prüfe auf technische Begriffe
        doc = self.nlp(text[:5000])
        technical_found = sum(1 for token in doc 
                            if token.text.lower() in self.technical_terms)
        
        if technical_found > 5:
            score += 0.1
        
        # Prüfe auf Konsistenz in Begriffen
        term_variants = {
            'dokument': ['dokument', 'dokumente', 'dokumenten'],
            'akte': ['akte', 'akten'],
            'workflow': ['workflow', 'workflows', 'prozess', 'prozesse']
        }
        
        for base_term, variants in term_variants.items():
            found_variants = [v for v in variants if v in text.lower()]
            if len(found_variants) == 1:
                score += 0.05  # Konsistente Verwendung
        
        return min(1.0, score)
    
    def _calculate_chunk_completeness(self, chunk_text: str) -> float:
        """
        Spezialisierte Vollständigkeitsprüfung für Chunks
        """
        issues = 0
        
        # Prüfe auf abgeschnittene Sätze
        if not chunk_text.strip().endswith(('.', '!', '?', ':', ';')):
            issues += 1
        
        # Prüfe auf fehlenden Satzanfang
        if chunk_text.strip() and chunk_text[0].islower():
            issues += 1
        
        # Prüfe auf unvollständige Strukturen
        open_brackets = chunk_text.count('(') - chunk_text.count(')')
        open_quotes = chunk_text.count('"') % 2
        
        if open_brackets != 0:
            issues += 1
        if open_quotes != 0:
            issues += 1
        
        completeness = 1.0 - (issues * 0.25)
        return max(0, completeness)
    
    def _calculate_chunk_coherence(self, chunk_text: str) -> float:
        """
        Berechnet die interne Kohärenz eines Chunks
        """
        doc = self.nlp(chunk_text)
        sentences = list(doc.sents)
        
        if len(sentences) <= 1:
            return 1.0  # Einzelne Sätze sind kohärent
        
        # Analysiere Überlappung von Entitäten/Nomen zwischen Sätzen
        coherence_scores = []
        
        for i in range(len(sentences) - 1):
            sent1_tokens = {token.lemma_.lower() for token in sentences[i] 
                          if token.pos_ in ['NOUN', 'PROPN']}
            sent2_tokens = {token.lemma_.lower() for token in sentences[i+1] 
                          if token.pos_ in ['NOUN', 'PROPN']}
            
            if sent1_tokens and sent2_tokens:
                overlap = len(sent1_tokens & sent2_tokens)
                total = len(sent1_tokens | sent2_tokens)
                coherence_scores.append(overlap / total if total > 0 else 0)
        
        if coherence_scores:
            return sum(coherence_scores) / len(coherence_scores)
        
        return 0.7  # Default mittlere Kohärenz


def evaluate_document_quality(file_path: str) -> Dict[str, Any]:
    """
    Hilfsfunktion zur Bewertung eines Dokuments
    """
    scorer = DocumentQualityScorer()
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Dokument-Score
    doc_score = scorer.score_document(content, {'file_path': file_path})
    
    # Chunk-Scores (Beispiel mit einfacher Aufteilung)
    chunks = content.split('\n\n')
    chunk_scores = []
    
    for i, chunk in enumerate(chunks[:5]):  # Erste 5 Chunks
        if chunk.strip():
            chunk_score = scorer.score_chunk(chunk)
            chunk_scores.append({
                'chunk_id': i,
                'length': len(chunk),
                'score': chunk_score.to_dict()
            })
    
    return {
        'document_score': doc_score.to_dict(),
        'chunk_samples': chunk_scores,
        'summary': {
            'avg_chunk_score': np.mean([c['score']['overall'] for c in chunk_scores]),
            'quality_rating': 'Excellent' if doc_score.overall_score > 0.8 else
                            'Good' if doc_score.overall_score > 0.6 else
                            'Fair' if doc_score.overall_score > 0.4 else 'Poor'
        }
    }


if __name__ == "__main__":
    # Test mit Beispiel-Text
    test_text = """
# nscale Dokumentenverwaltung

nscale ist ein Enterprise Content Management System, das die effiziente Verwaltung 
von Dokumenten und Akten ermöglicht.

## Hauptfunktionen

Die wichtigsten Funktionen umfassen:
- Dokumentenverwaltung mit Versionierung
- Workflow-Automatisierung
- Compliance und Retention Management
- Volltext- und Metadatensuche

### Dokumentenverwaltung

Die Dokumentenverwaltung in nscale basiert auf einem hierarchischen System. 
Dokumente können in Ordnern organisiert werden, wobei jedes Dokument 
umfangreiche Metadaten besitzt.

| Feature | Beschreibung |
|---------|--------------|
| Versionierung | Automatische Versionskontrolle aller Änderungen |
| Metadaten | Flexible Metadatenverwaltung |
| Suche | Leistungsfähige Volltext- und Metadatensuche |
"""
    
    scorer = DocumentQualityScorer()
    
    # Dokument bewerten
    doc_metrics = scorer.score_document(test_text)
    print("Dokument-Qualität:")
    print(f"  Gesamt-Score: {doc_metrics.overall_score:.3f}")
    print(f"  Lesbarkeit: {doc_metrics.readability_score:.1f}/100")
    print(f"  Struktur: {doc_metrics.structure_score:.3f}")
    print(f"  Informationsdichte: {doc_metrics.information_density:.3f}")
    
    if doc_metrics.issues:
        print("\nGefundene Probleme:")
        for issue in doc_metrics.issues:
            print(f"  - {issue}")
    
    if doc_metrics.recommendations:
        print("\nEmpfehlungen:")
        for rec in doc_metrics.recommendations:
            print(f"  - {rec}")