import logging
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
import json
import pickle
import os
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime
import re
from collections import Counter
import asyncio

logger = logging.getLogger(__name__)

@dataclass
class DocumentClass:
    """Document classification result"""
    name: str
    confidence: float
    features: Dict[str, float]
    metadata: Dict[str, Any]

@dataclass
class ClassificationModel:
    """ML classification model"""
    name: str
    version: str
    accuracy: float
    classes: List[str]
    features: List[str]
    trained_at: datetime
    model_data: Any  # Actual model (would be sklearn/torch model in production)

class DocumentClassifier:
    """ML-based document classification system"""
    
    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir or os.path.join(
            Path(__file__).parent.parent.parent, 'models', 'classifiers'
        )
        os.makedirs(self.model_dir, exist_ok=True)
        
        # Document classes with their characteristics
        self.document_classes = {
            'invoice': {
                'keywords': ['invoice', 'rechnung', 'total', 'amount', 'due', 'payment', 'mwst', 'tax'],
                'patterns': [r'\d+\.\d{2}\s*(€|EUR|USD|\$)', r'Invoice\s*#?\s*\d+', r'Due\s*Date'],
                'structure_hints': ['table_present', 'currency_symbols', 'date_formats']
            },
            'contract': {
                'keywords': ['agreement', 'contract', 'vertrag', 'terms', 'conditions', 'party', 'parties'],
                'patterns': [r'\bparty\b', r'\bhereby\b', r'\bagreement\b', r'§\s*\d+'],
                'structure_hints': ['numbered_sections', 'legal_language', 'signatures']
            },
            'report': {
                'keywords': ['report', 'bericht', 'summary', 'analysis', 'findings', 'conclusion'],
                'patterns': [r'Executive\s*Summary', r'\d+\.\s+[A-Z]', r'Figure\s*\d+'],
                'structure_hints': ['headings', 'numbered_sections', 'charts_mentioned']
            },
            'email': {
                'keywords': ['from', 'to', 'subject', 'date', 'dear', 'regards', 'sincerely'],
                'patterns': [r'From:\s*', r'To:\s*', r'Subject:\s*', r'@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'],
                'structure_hints': ['email_headers', 'greeting', 'signature']
            },
            'form': {
                'keywords': ['form', 'formular', 'fill', 'complete', 'submit', 'application'],
                'patterns': [r'\[\s*\]', r'____+', r'Please\s+fill', r'Required\s*\*'],
                'structure_hints': ['checkboxes', 'fill_lines', 'field_labels']
            },
            'letter': {
                'keywords': ['dear', 'sincerely', 'regards', 'yours', 'faithfully'],
                'patterns': [r'Dear\s+[A-Z]', r'Sincerely,?\s*$', r'\d{5}\s+[A-Z]'],
                'structure_hints': ['address_block', 'greeting', 'signature', 'date']
            },
            'technical': {
                'keywords': ['specification', 'technical', 'manual', 'documentation', 'api', 'code'],
                'patterns': [r'\bAPI\b', r'\bHTTP\b', r'\{[^}]+\}', r'function\s*\('],
                'structure_hints': ['code_blocks', 'technical_terms', 'diagrams_mentioned']
            },
            'financial': {
                'keywords': ['balance', 'revenue', 'expense', 'profit', 'loss', 'statement'],
                'patterns': [r'\$?\d{1,3}(,\d{3})*(\.\d{2})?', r'Q[1-4]\s*20\d{2}', r'%\s*change'],
                'structure_hints': ['financial_tables', 'percentages', 'currency_amounts']
            }
        }
        
        # Feature extractors
        self.feature_extractors = {
            'keyword_density': self._extract_keyword_density,
            'pattern_matches': self._extract_pattern_matches,
            'structure_score': self._extract_structure_score,
            'text_statistics': self._extract_text_statistics,
            'language_features': self._extract_language_features
        }
        
        # Load pre-trained models
        self.models = self._load_models()
        
        # Classification cache
        self.cache = {}
    
    def _load_models(self) -> Dict[str, ClassificationModel]:
        """Load pre-trained classification models"""
        models = {}
        
        # For demo purposes, create a simple rule-based "model"
        # In production, this would load actual ML models (sklearn, torch, etc.)
        models['rule_based_v1'] = ClassificationModel(
            name='rule_based_v1',
            version='1.0',
            accuracy=0.85,
            classes=list(self.document_classes.keys()),
            features=['keyword_density', 'pattern_matches', 'structure_score'],
            trained_at=datetime.now(),
            model_data={'type': 'rules'}  # Placeholder
        )
        
        return models
    
    async def classify_document(self, text: str, metadata: Optional[Dict[str, Any]] = None,
                              use_model: str = 'rule_based_v1') -> List[DocumentClass]:
        """Classify a document using ML models"""
        # Check cache
        cache_key = hash(text[:1000])  # Use first 1000 chars for cache key
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Extract features
        features = await self._extract_features(text, metadata)
        
        # Get model
        model = self.models.get(use_model)
        if not model:
            logger.warning(f"Model {use_model} not found, using rule-based classification")
            return await self._rule_based_classification(text, features)
        
        # Classify based on model type
        if model.model_data.get('type') == 'rules':
            results = await self._rule_based_classification(text, features)
        else:
            # Would call actual ML model here
            results = await self._ml_model_classification(text, features, model)
        
        # Cache results
        self.cache[cache_key] = results
        
        return results
    
    async def _extract_features(self, text: str, metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract features from document text"""
        features = {}
        
        # Run all feature extractors
        for name, extractor in self.feature_extractors.items():
            features[name] = await extractor(text, metadata)
        
        return features
    
    async def _extract_keyword_density(self, text: str, metadata: Optional[Dict[str, Any]]) -> Dict[str, float]:
        """Extract keyword density features"""
        text_lower = text.lower()
        word_count = len(text_lower.split())
        
        densities = {}
        for doc_class, config in self.document_classes.items():
            keyword_count = sum(
                text_lower.count(keyword) 
                for keyword in config['keywords']
            )
            densities[doc_class] = keyword_count / word_count if word_count > 0 else 0
        
        return densities
    
    async def _extract_pattern_matches(self, text: str, metadata: Optional[Dict[str, Any]]) -> Dict[str, int]:
        """Extract pattern match features"""
        matches = {}
        
        for doc_class, config in self.document_classes.items():
            match_count = 0
            for pattern in config['patterns']:
                match_count += len(re.findall(pattern, text, re.IGNORECASE))
            matches[doc_class] = match_count
        
        return matches
    
    async def _extract_structure_score(self, text: str, metadata: Optional[Dict[str, Any]]) -> Dict[str, float]:
        """Extract document structure features"""
        scores = {}
        
        # Analyze structure
        has_tables = bool(re.search(r'\|.*\|', text)) or text.count('\t') > 5
        has_numbered_sections = bool(re.search(r'^\d+\.\s+', text, re.MULTILINE))
        has_headers = bool(re.search(r'^#{1,6}\s+', text, re.MULTILINE)) or \
                     bool(re.search(r'^[A-Z][A-Z\s]+$', text, re.MULTILINE))
        has_currency = bool(re.search(r'[$€£¥]|EUR|USD|GBP', text))
        has_dates = bool(re.search(r'\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}', text))
        has_email = bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text))
        
        # Calculate structure scores
        structure_features = {
            'table_present': has_tables,
            'currency_symbols': has_currency,
            'date_formats': has_dates,
            'numbered_sections': has_numbered_sections,
            'headings': has_headers,
            'email_headers': has_email
        }
        
        for doc_class, config in self.document_classes.items():
            score = sum(
                1 for hint in config['structure_hints']
                if structure_features.get(hint, False)
            ) / len(config['structure_hints'])
            scores[doc_class] = score
        
        return scores
    
    async def _extract_text_statistics(self, text: str, metadata: Optional[Dict[str, Any]]) -> Dict[str, float]:
        """Extract text statistics features"""
        lines = text.split('\n')
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        
        return {
            'line_count': len(lines),
            'word_count': len(words),
            'sentence_count': len(sentences),
            'avg_line_length': sum(len(line) for line in lines) / len(lines) if lines else 0,
            'avg_word_length': sum(len(word) for word in words) / len(words) if words else 0,
            'avg_sentence_length': sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0,
            'uppercase_ratio': sum(1 for c in text if c.isupper()) / len(text) if text else 0,
            'digit_ratio': sum(1 for c in text if c.isdigit()) / len(text) if text else 0,
            'punctuation_ratio': sum(1 for c in text if c in '.,;:!?') / len(text) if text else 0
        }
    
    async def _extract_language_features(self, text: str, metadata: Optional[Dict[str, Any]]) -> Dict[str, float]:
        """Extract language-based features"""
        # Simple language detection based on common words
        german_words = ['der', 'die', 'das', 'und', 'ist', 'von', 'mit', 'für']
        english_words = ['the', 'and', 'is', 'of', 'to', 'in', 'for', 'with']
        
        text_lower = text.lower()
        words = text_lower.split()
        
        german_count = sum(1 for word in words if word in german_words)
        english_count = sum(1 for word in words if word in english_words)
        
        total = german_count + english_count
        
        return {
            'language_german': german_count / total if total > 0 else 0,
            'language_english': english_count / total if total > 0 else 0,
            'formal_tone': sum(1 for word in words if word in ['hereby', 'whereas', 'pursuant']) / len(words) if words else 0
        }
    
    async def _rule_based_classification(self, text: str, features: Dict[str, Any]) -> List[DocumentClass]:
        """Rule-based document classification"""
        results = []
        
        # Calculate scores for each class
        class_scores = {}
        
        for doc_class in self.document_classes:
            score = 0.0
            
            # Keyword density contribution (40%)
            if 'keyword_density' in features:
                score += features['keyword_density'].get(doc_class, 0) * 40
            
            # Pattern matches contribution (30%)
            if 'pattern_matches' in features:
                pattern_score = features['pattern_matches'].get(doc_class, 0)
                # Normalize by max 10 matches
                score += min(pattern_score / 10, 1.0) * 30
            
            # Structure score contribution (30%)
            if 'structure_score' in features:
                score += features['structure_score'].get(doc_class, 0) * 30
            
            class_scores[doc_class] = score
        
        # Sort by score and create results
        sorted_classes = sorted(class_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Return top classes with confidence > 20%
        for doc_class, score in sorted_classes:
            if score >= 20:
                results.append(DocumentClass(
                    name=doc_class,
                    confidence=min(score / 100, 1.0),
                    features={
                        'keyword_density': features.get('keyword_density', {}).get(doc_class, 0),
                        'pattern_matches': features.get('pattern_matches', {}).get(doc_class, 0),
                        'structure_score': features.get('structure_score', {}).get(doc_class, 0)
                    },
                    metadata={}
                ))
        
        # If no strong classification, return 'general'
        if not results:
            results.append(DocumentClass(
                name='general',
                confidence=0.5,
                features={},
                metadata={'reason': 'No strong classification signals found'}
            ))
        
        return results
    
    async def _ml_model_classification(self, text: str, features: Dict[str, Any], 
                                     model: ClassificationModel) -> List[DocumentClass]:
        """ML model-based classification (placeholder for real ML models)"""
        # In production, this would:
        # 1. Vectorize features according to model requirements
        # 2. Run inference using the loaded model
        # 3. Apply softmax/normalization to get probabilities
        # 4. Return top classes with confidence scores
        
        # For now, fall back to rule-based
        return await self._rule_based_classification(text, features)
    
    async def train_model(self, training_data: List[Tuple[str, str]], 
                         model_name: str = 'custom_model') -> ClassificationModel:
        """Train a new classification model"""
        logger.info(f"Training new model: {model_name}")
        
        # Extract features from training data
        X = []  # Features
        y = []  # Labels
        
        for text, label in training_data:
            features = await self._extract_features(text, None)
            # Flatten features into vector
            feature_vector = []
            for feature_type, values in features.items():
                if isinstance(values, dict):
                    feature_vector.extend(values.values())
                elif isinstance(values, (int, float)):
                    feature_vector.append(values)
            
            X.append(feature_vector)
            y.append(label)
        
        # In production, would train actual ML model here
        # For demo, create a mock trained model
        model = ClassificationModel(
            name=model_name,
            version='1.0',
            accuracy=0.9,  # Mock accuracy
            classes=list(set(y)),
            features=['all_extracted_features'],
            trained_at=datetime.now(),
            model_data={'trained_on': len(training_data), 'type': 'mock'}
        )
        
        # Save model
        self.models[model_name] = model
        self._save_model(model)
        
        return model
    
    def _save_model(self, model: ClassificationModel):
        """Save model to disk"""
        model_path = os.path.join(self.model_dir, f"{model.name}.pkl")
        
        # In production, would save actual model weights
        # For demo, save model metadata
        with open(model_path, 'wb') as f:
            pickle.dump({
                'name': model.name,
                'version': model.version,
                'accuracy': model.accuracy,
                'classes': model.classes,
                'features': model.features,
                'trained_at': model.trained_at.isoformat()
            }, f)
        
        logger.info(f"Model saved: {model_path}")
    
    async def evaluate_model(self, model_name: str, test_data: List[Tuple[str, str]]) -> Dict[str, Any]:
        """Evaluate model performance"""
        if model_name not in self.models:
            raise ValueError(f"Model {model_name} not found")
        
        correct = 0
        predictions = []
        
        for text, true_label in test_data:
            results = await self.classify_document(text, use_model=model_name)
            predicted_label = results[0].name if results else 'unknown'
            
            predictions.append({
                'true': true_label,
                'predicted': predicted_label,
                'confidence': results[0].confidence if results else 0
            })
            
            if predicted_label == true_label:
                correct += 1
        
        accuracy = correct / len(test_data) if test_data else 0
        
        # Calculate per-class metrics
        class_metrics = {}
        for class_name in self.document_classes:
            true_positives = sum(
                1 for p in predictions 
                if p['true'] == class_name and p['predicted'] == class_name
            )
            false_positives = sum(
                1 for p in predictions 
                if p['true'] != class_name and p['predicted'] == class_name
            )
            false_negatives = sum(
                1 for p in predictions 
                if p['true'] == class_name and p['predicted'] != class_name
            )
            
            precision = true_positives / (true_positives + false_positives) \
                       if (true_positives + false_positives) > 0 else 0
            recall = true_positives / (true_positives + false_negatives) \
                    if (true_positives + false_negatives) > 0 else 0
            f1 = 2 * (precision * recall) / (precision + recall) \
                if (precision + recall) > 0 else 0
            
            class_metrics[class_name] = {
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'support': sum(1 for p in predictions if p['true'] == class_name)
            }
        
        return {
            'accuracy': accuracy,
            'total_samples': len(test_data),
            'correct_predictions': correct,
            'class_metrics': class_metrics,
            'predictions': predictions[:10]  # First 10 for inspection
        }
    
    def get_classification_report(self) -> Dict[str, Any]:
        """Get comprehensive classification system report"""
        return {
            'available_models': list(self.models.keys()),
            'document_classes': list(self.document_classes.keys()),
            'feature_extractors': list(self.feature_extractors.keys()),
            'cache_size': len(self.cache),
            'models_info': {
                name: {
                    'version': model.version,
                    'accuracy': model.accuracy,
                    'classes': model.classes,
                    'trained_at': model.trained_at.isoformat()
                }
                for name, model in self.models.items()
            }
        }

# Global document classifier instance
document_classifier = DocumentClassifier()