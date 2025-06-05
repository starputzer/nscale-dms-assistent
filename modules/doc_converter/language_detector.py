"""
Language Detection for documents.
Part of Phase 2.7: Advanced Document Intelligence & Integration
"""

import logging
from typing import Dict, List, Optional, Tuple, Any
from collections import Counter
import re

try:
    from langdetect import detect_langs, detect
    from langdetect.lang_detect_exception import LangDetectException
    LANGDETECT_AVAILABLE = True
except ImportError:
    LANGDETECT_AVAILABLE = False
    logging.warning("langdetect not installed. Language detection will use fallback method.")

try:
    import langid
    LANGID_AVAILABLE = True
except ImportError:
    LANGID_AVAILABLE = False
    logging.warning("langid not installed. Additional language detection method unavailable.")

logger = logging.getLogger(__name__)


class LanguageDetector:
    """Detect languages in documents with multiple detection methods."""
    
    # Common words in different languages for fallback detection
    LANGUAGE_INDICATORS = {
        'de': ['der', 'die', 'das', 'und', 'ist', 'von', 'mit', 'für', 'auf', 'in'],
        'en': ['the', 'and', 'is', 'of', 'to', 'in', 'for', 'with', 'on', 'at'],
        'fr': ['le', 'la', 'les', 'de', 'et', 'est', 'pour', 'dans', 'avec', 'sur'],
        'es': ['el', 'la', 'los', 'las', 'de', 'y', 'es', 'para', 'con', 'en'],
        'it': ['il', 'la', 'di', 'e', 'è', 'per', 'con', 'in', 'del', 'della'],
    }
    
    # Language names mapping
    LANGUAGE_NAMES = {
        'de': 'German',
        'en': 'English',
        'fr': 'French',
        'es': 'Spanish',
        'it': 'Italian',
        'pt': 'Portuguese',
        'nl': 'Dutch',
        'pl': 'Polish',
        'ru': 'Russian',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic'
    }
    
    def __init__(self, 
                 min_confidence: float = 0.7,
                 sample_size: int = 1000,
                 use_multiple_detectors: bool = True):
        """
        Initialize language detector.
        
        Args:
            min_confidence: Minimum confidence threshold
            sample_size: Number of characters to sample for detection
            use_multiple_detectors: Use multiple detection libraries
        """
        self.min_confidence = min_confidence
        self.sample_size = sample_size
        self.use_multiple_detectors = use_multiple_detectors
        
    def detect_language(self, text: str) -> Dict[str, Any]:
        """
        Detect primary language of text.
        
        Returns:
            Dictionary with language code, name, confidence, and method used
        """
        if not text or len(text.strip()) < 10:
            return {
                'language': 'unknown',
                'language_name': 'Unknown',
                'confidence': 0.0,
                'method': 'none',
                'error': 'Text too short'
            }
            
        # Clean and prepare text
        text = self._prepare_text(text)
        
        # Try different detection methods
        results = []
        
        if LANGDETECT_AVAILABLE:
            result = self._detect_with_langdetect(text)
            if result:
                results.append(result)
                
        if LANGID_AVAILABLE and self.use_multiple_detectors:
            result = self._detect_with_langid(text)
            if result:
                results.append(result)
                
        # Fallback to simple detection
        if not results or all(r['confidence'] < self.min_confidence for r in results):
            result = self._detect_with_indicators(text)
            if result:
                results.append(result)
                
        # Select best result
        if results:
            best_result = max(results, key=lambda x: x['confidence'])
            best_result['all_results'] = results
            return best_result
        else:
            return {
                'language': 'unknown',
                'language_name': 'Unknown',
                'confidence': 0.0,
                'method': 'none',
                'error': 'Could not detect language'
            }
            
    def detect_multiple_languages(self, text: str, threshold: float = 0.1) -> List[Dict[str, Any]]:
        """
        Detect multiple languages in text.
        
        Args:
            text: Text to analyze
            threshold: Minimum probability threshold
            
        Returns:
            List of detected languages with probabilities
        """
        if not LANGDETECT_AVAILABLE:
            # Use primary detection as fallback
            primary = self.detect_language(text)
            return [primary] if primary['language'] != 'unknown' else []
            
        try:
            # Sample text if too long
            if len(text) > self.sample_size * 5:
                text = self._sample_text(text, self.sample_size * 5)
                
            # Detect languages
            langs = detect_langs(text)
            
            results = []
            for lang in langs:
                if lang.prob >= threshold:
                    results.append({
                        'language': lang.lang,
                        'language_name': self.LANGUAGE_NAMES.get(lang.lang, lang.lang.upper()),
                        'probability': lang.prob,
                        'confidence': lang.prob
                    })
                    
            return results
            
        except LangDetectException as e:
            logger.warning(f"Language detection failed: {e}")
            return []
            
    def _prepare_text(self, text: str) -> str:
        """Prepare text for language detection."""
        # Remove excessive whitespace
        text = ' '.join(text.split())
        
        # Remove URLs
        text = re.sub(r'https?://\S+', '', text)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Sample if too long
        if len(text) > self.sample_size:
            text = self._sample_text(text, self.sample_size)
            
        return text
        
    def _sample_text(self, text: str, size: int) -> str:
        """Sample text for detection."""
        # Take samples from beginning, middle, and end
        if len(text) <= size:
            return text
            
        part_size = size // 3
        start = text[:part_size]
        middle_idx = len(text) // 2 - part_size // 2
        middle = text[middle_idx:middle_idx + part_size]
        end = text[-part_size:]
        
        return start + ' ' + middle + ' ' + end
        
    def _detect_with_langdetect(self, text: str) -> Optional[Dict[str, Any]]:
        """Detect language using langdetect library."""
        try:
            # Get detection with probabilities
            langs = detect_langs(text)
            if langs:
                best = langs[0]
                return {
                    'language': best.lang,
                    'language_name': self.LANGUAGE_NAMES.get(best.lang, best.lang.upper()),
                    'confidence': best.prob,
                    'method': 'langdetect',
                    'alternatives': [
                        {'language': l.lang, 'confidence': l.prob} 
                        for l in langs[1:3]
                    ]
                }
        except Exception as e:
            logger.debug(f"langdetect failed: {e}")
            
        return None
        
    def _detect_with_langid(self, text: str) -> Optional[Dict[str, Any]]:
        """Detect language using langid library."""
        try:
            lang, confidence = langid.classify(text)
            # langid uses negative log probability, convert to 0-1
            confidence = min(1.0, max(0.0, 1.0 + confidence / 100))
            
            return {
                'language': lang,
                'language_name': self.LANGUAGE_NAMES.get(lang, lang.upper()),
                'confidence': confidence,
                'method': 'langid'
            }
        except Exception as e:
            logger.debug(f"langid failed: {e}")
            
        return None
        
    def _detect_with_indicators(self, text: str) -> Optional[Dict[str, Any]]:
        """Simple language detection using word indicators."""
        text_lower = text.lower()
        words = re.findall(r'\b\w+\b', text_lower)
        
        if not words:
            return None
            
        # Count indicator words for each language
        scores = {}
        for lang, indicators in self.LANGUAGE_INDICATORS.items():
            score = sum(1 for word in words if word in indicators)
            if score > 0:
                scores[lang] = score / len(words)
                
        if not scores:
            return None
            
        # Get best match
        best_lang = max(scores, key=scores.get)
        confidence = scores[best_lang]
        
        return {
            'language': best_lang,
            'language_name': self.LANGUAGE_NAMES.get(best_lang, best_lang.upper()),
            'confidence': min(confidence * 10, 0.9),  # Scale up but cap at 0.9
            'method': 'indicators'
        }
        
    def get_supported_languages(self) -> List[Dict[str, str]]:
        """Get list of supported languages."""
        return [
            {'code': code, 'name': name}
            for code, name in self.LANGUAGE_NAMES.items()
        ]
        
    def is_mixed_language(self, text: str, threshold: float = 0.3) -> bool:
        """
        Check if text contains mixed languages.
        
        Args:
            text: Text to check
            threshold: Threshold for secondary language probability
            
        Returns:
            True if multiple languages detected above threshold
        """
        languages = self.detect_multiple_languages(text, threshold)
        return len(languages) > 1