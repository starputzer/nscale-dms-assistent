"""
Quality Assurance System for Document Processing
Provides automated quality validation, retrieval testing, and improvement suggestions
"""

import os
import json
import time
import statistics
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field, asdict
from datetime import datetime
from collections import defaultdict
import re
import random

from ..core.logging import LogManager
from ..doc_converter.document_classifier import ClassificationResult
from doc_converter.processing.enhanced_processor import ProcessedDocument
from .knowledge_manager import KnowledgeManager


@dataclass
class QualityScore:
    """Overall quality score for a document"""
    overall_score: float  # 0.0 to 1.0
    extraction_quality: float
    structure_quality: float
    metadata_quality: float
    reference_quality: float
    readability_score: float
    completeness_score: float
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AccuracyTest:
    """Result of retrieval accuracy test"""
    test_id: str
    document_id: str
    test_queries: List[str]
    expected_results: List[str]
    actual_results: List[str]
    precision: float
    recall: float
    f1_score: float
    avg_response_time: float
    test_timestamp: datetime


@dataclass
class QualityReport:
    """Comprehensive quality report for a document"""
    document_id: str
    quality_score: QualityScore
    accuracy_tests: List[AccuracyTest]
    issues_found: List[Dict[str, Any]]
    performance_metrics: Dict[str, float]
    timestamp: datetime
    recommendations: List[str]


@dataclass
class ImprovementSuggestion:
    """Suggestion for improving document quality"""
    category: str  # 'structure', 'content', 'metadata', 'performance'
    priority: str  # 'high', 'medium', 'low'
    issue: str
    suggestion: str
    expected_impact: float  # Expected quality score improvement


@dataclass
class PerformanceMetrics:
    """Performance metrics for document processing"""
    processing_time: float
    memory_usage: float
    chunk_generation_time: float
    embedding_time: float
    indexing_time: float
    retrieval_avg_time: float
    throughput: float  # Documents per second


class QualityAssurance:
    """
    Quality Assurance system for document processing and retrieval
    """
    
    def __init__(self, knowledge_manager: Optional[KnowledgeManager] = None, 
                 config: Optional[Dict[str, Any]] = None):
        """Initialize the quality assurance system"""
        self.config = config or {}
        self.logger = LogManager.setup_logging(__name__)
        self.knowledge_manager = knowledge_manager
        
        # Quality thresholds
        self.quality_thresholds = {
            'min_overall_score': self.config.get('min_overall_score', 0.7),
            'min_extraction_quality': self.config.get('min_extraction_quality', 0.8),
            'min_structure_quality': self.config.get('min_structure_quality', 0.7),
            'min_metadata_quality': self.config.get('min_metadata_quality', 0.6),
            'min_readability': self.config.get('min_readability', 0.5),
            'min_retrieval_accuracy': self.config.get('min_retrieval_accuracy', 0.75)
        }
        
        # Performance benchmarks
        self.performance_benchmarks = {
            'max_processing_time': self.config.get('max_processing_time', 10.0),  # seconds
            'max_retrieval_time': self.config.get('max_retrieval_time', 0.5),  # seconds
            'min_throughput': self.config.get('min_throughput', 5.0)  # docs/second
        }
        
        # Test query templates
        self.test_query_templates = [
            "Was ist {topic}?",
            "Wie funktioniert {feature}?",
            "Welche {category} gibt es?",
            "Was sind die Voraussetzungen für {process}?",
            "Wie kann ich {action} durchführen?",
            "What is {topic}?",
            "How does {feature} work?",
            "What are the requirements for {process}?"
        ]
        
        self.logger.info("✅ QualityAssurance system initialized")
    
    def validate_extraction_quality(self, doc: ProcessedDocument) -> QualityScore:
        """
        Validate the quality of extracted content
        
        Args:
            doc: Processed document to validate
            
        Returns:
            QualityScore with detailed metrics
        """
        self.logger.info(f"🔍 Validating extraction quality for: {doc.document_id}")
        
        # Initialize scores
        scores = {
            'table_quality': self._assess_table_quality(doc.tables),
            'code_quality': self._assess_code_quality(doc.code_snippets),
            'reference_quality': self._assess_reference_quality(doc.references),
            'metadata_quality': self._assess_metadata_quality(doc.metadata),
            'structure_quality': self._assess_structure_quality(doc.structured_content),
            'content_coherence': self._assess_content_coherence(doc),
            'completeness': self._assess_completeness(doc)
        }
        
        # Calculate readability
        readability = self._calculate_readability_score(doc.content)
        
        # Calculate weighted overall score
        weights = {
            'table_quality': 0.15,
            'code_quality': 0.15,
            'reference_quality': 0.10,
            'metadata_quality': 0.15,
            'structure_quality': 0.20,
            'content_coherence': 0.15,
            'completeness': 0.10
        }
        
        extraction_quality = sum(scores[metric] * weight 
                               for metric, weight in weights.items())
        
        # Create quality score
        quality_score = QualityScore(
            overall_score=extraction_quality * 0.7 + readability * 0.3,
            extraction_quality=extraction_quality,
            structure_quality=scores['structure_quality'],
            metadata_quality=scores['metadata_quality'],
            reference_quality=scores['reference_quality'],
            readability_score=readability,
            completeness_score=scores['completeness'],
            details=scores
        )
        
        self.logger.info(f"📊 Quality Score: {quality_score.overall_score:.2f}")
        
        return quality_score
    
    def test_retrieval_accuracy(self, doc: ProcessedDocument) -> AccuracyTest:
        """
        Test retrieval accuracy with synthetic queries
        
        Args:
            doc: Document to test
            
        Returns:
            AccuracyTest results
        """
        self.logger.info(f"🎯 Testing retrieval accuracy for: {doc.document_id}")
        
        # Generate test queries based on document content
        test_queries = self._generate_test_queries(doc)
        
        # Define expected results based on document content
        expected_results = self._define_expected_results(doc, test_queries)
        
        # Simulate retrieval (in real implementation, would use actual RAG system)
        actual_results = []
        response_times = []
        
        for query in test_queries:
            start_time = time.time()
            
            # Simulate retrieval
            results = self._simulate_retrieval(query, doc)
            actual_results.extend(results)
            
            response_times.append(time.time() - start_time)
        
        # Calculate metrics
        precision, recall, f1 = self._calculate_retrieval_metrics(
            expected_results, actual_results
        )
        
        # Create test result
        accuracy_test = AccuracyTest(
            test_id=f"test_{doc.document_id}_{datetime.now().timestamp()}",
            document_id=doc.document_id,
            test_queries=test_queries,
            expected_results=expected_results,
            actual_results=actual_results,
            precision=precision,
            recall=recall,
            f1_score=f1,
            avg_response_time=statistics.mean(response_times) if response_times else 0,
            test_timestamp=datetime.now()
        )
        
        self.logger.info(f"🎯 Retrieval F1 Score: {f1:.2f}")
        
        return accuracy_test
    
    def generate_quality_report(self, doc: ProcessedDocument) -> QualityReport:
        """
        Generate comprehensive quality report
        
        Args:
            doc: Document to analyze
            
        Returns:
            Complete QualityReport
        """
        self.logger.info(f"📋 Generating quality report for: {doc.document_id}")
        
        # Validate extraction quality
        quality_score = self.validate_extraction_quality(doc)
        
        # Test retrieval accuracy
        accuracy_test = self.test_retrieval_accuracy(doc)
        
        # Identify issues
        issues = self._identify_quality_issues(doc, quality_score, accuracy_test)
        
        # Measure performance
        performance_metrics = self._measure_performance_metrics(doc)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            doc, quality_score, accuracy_test, issues, performance_metrics
        )
        
        # Create report
        report = QualityReport(
            document_id=doc.document_id,
            quality_score=quality_score,
            accuracy_tests=[accuracy_test],
            issues_found=issues,
            performance_metrics=performance_metrics,
            timestamp=datetime.now(),
            recommendations=recommendations
        )
        
        self.logger.info(f"✅ Quality report generated with {len(issues)} issues found")
        
        return report
    
    def suggest_improvements(self, doc: ProcessedDocument) -> List[ImprovementSuggestion]:
        """
        Generate improvement suggestions
        
        Args:
            doc: Document to analyze
            
        Returns:
            List of improvement suggestions
        """
        suggestions = []
        
        # Analyze quality report
        report = self.generate_quality_report(doc)
        
        # Structure improvements
        if report.quality_score.structure_quality < self.quality_thresholds['min_structure_quality']:
            suggestions.append(ImprovementSuggestion(
                category='structure',
                priority='high',
                issue='Poor document structure',
                suggestion='Add clear section headings and hierarchical organization',
                expected_impact=0.15
            ))
        
        # Metadata improvements
        if report.quality_score.metadata_quality < self.quality_thresholds['min_metadata_quality']:
            missing_metadata = self._identify_missing_metadata(doc.metadata)
            for field in missing_metadata:
                suggestions.append(ImprovementSuggestion(
                    category='metadata',
                    priority='medium',
                    issue=f'Missing metadata: {field}',
                    suggestion=f'Add {field} to document metadata',
                    expected_impact=0.05
                ))
        
        # Content improvements
        if report.quality_score.readability_score < self.quality_thresholds['min_readability']:
            suggestions.append(ImprovementSuggestion(
                category='content',
                priority='medium',
                issue='Low readability score',
                suggestion='Simplify complex sentences and use clearer language',
                expected_impact=0.10
            ))
        
        # Table improvements
        if doc.tables and report.quality_score.details.get('table_quality', 1.0) < 0.8:
            suggestions.append(ImprovementSuggestion(
                category='content',
                priority='low',
                issue='Tables lack context',
                suggestion='Add captions and descriptions to tables',
                expected_impact=0.05
            ))
        
        # Code improvements
        if doc.code_snippets and report.quality_score.details.get('code_quality', 1.0) < 0.8:
            suggestions.append(ImprovementSuggestion(
                category='content',
                priority='low',
                issue='Code snippets lack documentation',
                suggestion='Add comments and explanations to code examples',
                expected_impact=0.05
            ))
        
        # Performance improvements
        if report.performance_metrics.get('processing_time', 0) > self.performance_benchmarks['max_processing_time']:
            suggestions.append(ImprovementSuggestion(
                category='performance',
                priority='high',
                issue='Slow processing time',
                suggestion='Consider splitting large documents or optimizing content',
                expected_impact=0.20
            ))
        
        # Sort by priority and impact
        suggestions.sort(key=lambda s: (
            {'high': 0, 'medium': 1, 'low': 2}[s.priority],
            -s.expected_impact
        ))
        
        return suggestions
    
    def _assess_table_quality(self, tables: List[Any]) -> float:
        """Assess quality of extracted tables"""
        if not tables:
            return 1.0  # No tables is not a quality issue
        
        scores = []
        for table in tables:
            score = 1.0
            
            # Check headers
            if not table.headers or len(table.headers) < 2:
                score -= 0.2
            
            # Check rows
            if not table.rows or len(table.rows) < 1:
                score -= 0.3
            
            # Check consistency
            if table.rows:
                expected_cols = len(table.headers)
                inconsistent_rows = sum(1 for row in table.rows 
                                      if len(row) != expected_cols)
                if inconsistent_rows > 0:
                    score -= 0.2 * (inconsistent_rows / len(table.rows))
            
            # Check context
            if not table.caption and not table.preceding_text:
                score -= 0.1
            
            scores.append(max(0, score))
        
        return statistics.mean(scores) if scores else 0
    
    def _assess_code_quality(self, code_snippets: List[Any]) -> float:
        """Assess quality of code snippets"""
        if not code_snippets:
            return 1.0
        
        scores = []
        for snippet in code_snippets:
            score = 1.0
            
            # Check language detection
            if not snippet.language or snippet.language == 'text':
                score -= 0.2
            
            # Check code content
            if len(snippet.code.strip()) < 10:
                score -= 0.3
            
            # Check for common issues
            if snippet.code.count('\n') == 0 and len(snippet.code) > 80:
                score -= 0.1  # Single long line
            
            # Check documentation
            if not snippet.title and not snippet.description:
                score -= 0.2
            
            scores.append(max(0, score))
        
        return statistics.mean(scores) if scores else 0
    
    def _assess_reference_quality(self, references: List[Any]) -> float:
        """Assess quality of references"""
        if not references:
            return 1.0
        
        scores = []
        for ref in references:
            score = 1.0
            
            # Check reference completeness
            if not ref.source_text:
                score -= 0.2
            
            if not ref.target:
                score -= 0.3
            
            # Check for broken internal references
            if ref.ref_type == 'internal' and ref.target.startswith('#'):
                # In real implementation, would check if target exists
                pass
            
            # Check context
            if not ref.context:
                score -= 0.1
            
            scores.append(max(0, score))
        
        return statistics.mean(scores) if scores else 0
    
    def _assess_metadata_quality(self, metadata: Any) -> float:
        """Assess metadata completeness and quality"""
        score = 1.0
        
        # Check required fields
        required_fields = ['title', 'language']
        for field in required_fields:
            if not getattr(metadata, field, None):
                score -= 0.2
        
        # Check optional but important fields
        optional_fields = ['version', 'authors', 'date', 'keywords']
        missing_optional = sum(1 for field in optional_fields 
                             if not getattr(metadata, field, None))
        score -= 0.1 * (missing_optional / len(optional_fields))
        
        # Check quality of existing fields
        if metadata.title and len(metadata.title) < 5:
            score -= 0.1  # Too short title
        
        if metadata.keywords and len(metadata.keywords) < 3:
            score -= 0.05  # Too few keywords
        
        return max(0, score)
    
    def _assess_structure_quality(self, structured_content: Dict[str, Any]) -> float:
        """Assess document structure quality"""
        score = 1.0
        
        # Check for sections
        sections = structured_content.get('sections', [])
        if not sections:
            score -= 0.3
        elif len(sections) < 2:
            score -= 0.1
        
        # Check hierarchy
        hierarchy = structured_content.get('hierarchy', {})
        if not hierarchy or not hierarchy.get('children'):
            score -= 0.2
        
        # Check for key points
        key_points = structured_content.get('key_points', [])
        if not key_points:
            score -= 0.1
        elif len(key_points) < 3:
            score -= 0.05
        
        # Check for proper nesting
        if sections:
            # Check if sections have reasonable depth
            max_level = max(s.get('level', 1) for s in sections)
            if max_level > 6:
                score -= 0.1  # Too deep nesting
            elif max_level < 2:
                score -= 0.05  # Too flat
        
        return max(0, score)
    
    def _assess_content_coherence(self, doc: ProcessedDocument) -> float:
        """Assess content coherence and consistency"""
        score = 1.0
        
        # Check content length
        word_count = doc.statistics.get('text', {}).get('words', 0)
        if word_count < 50:
            score -= 0.3  # Too short
        elif word_count < 100:
            score -= 0.1
        
        # Check sentence structure
        sentences = doc.statistics.get('text', {}).get('sentences', 0)
        if sentences > 0:
            avg_sentence_length = word_count / sentences
            if avg_sentence_length > 30:
                score -= 0.1  # Sentences too long
            elif avg_sentence_length < 5:
                score -= 0.1  # Sentences too short
        
        # Check paragraph structure
        paragraphs = doc.statistics.get('text', {}).get('paragraphs', 0)
        if paragraphs > 0 and sentences > 0:
            avg_sentences_per_paragraph = sentences / paragraphs
            if avg_sentences_per_paragraph > 10:
                score -= 0.05  # Paragraphs too long
            elif avg_sentences_per_paragraph < 2:
                score -= 0.05  # Paragraphs too short
        
        return max(0, score)
    
    def _assess_completeness(self, doc: ProcessedDocument) -> float:
        """Assess document completeness"""
        score = 1.0
        
        # Check based on document category
        category = doc.classification.metadata.content_category.value
        
        if category == 'manual':
            # Manuals should have introduction, sections, examples
            if not doc.structured_content.get('sections'):
                score -= 0.2
            if not doc.code_snippets and not doc.tables:
                score -= 0.1  # No examples
                
        elif category == 'faq':
            # FAQs should have Q&A pairs
            qa_pairs = doc.structured_content.get('qa_pairs', [])
            if not qa_pairs:
                score -= 0.3
            elif len(qa_pairs) < 3:
                score -= 0.1
                
        elif category == 'api_documentation':
            # API docs should have code examples
            if not doc.code_snippets:
                score -= 0.2
            if not doc.references:
                score -= 0.1  # No links to resources
        
        # General completeness checks
        if not doc.metadata.title:
            score -= 0.1
        
        if doc.warnings:
            score -= 0.05 * len(doc.warnings)  # Deduct for each warning
        
        return max(0, score)
    
    def _calculate_readability_score(self, content: str) -> float:
        """Calculate readability score (simplified Flesch Reading Ease)"""
        if not content:
            return 0
        
        # Count sentences
        sentences = len(re.findall(r'[.!?]+', content))
        if sentences == 0:
            sentences = 1
        
        # Count words
        words = len(content.split())
        if words == 0:
            return 0
        
        # Count syllables (simplified - count vowel groups)
        syllables = len(re.findall(r'[aeiouäöüAEIOUÄÖÜ]+', content))
        if syllables == 0:
            syllables = words
        
        # Flesch Reading Ease formula (adapted for German)
        # Original: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
        # Simplified and normalized to 0-1
        avg_sentence_length = words / sentences
        avg_syllables_per_word = syllables / words
        
        # Normalize to 0-1 (higher is better)
        # Ideal: 15-20 words per sentence, 1.5-2 syllables per word
        sentence_score = 1.0 - abs(avg_sentence_length - 17.5) / 50
        syllable_score = 1.0 - abs(avg_syllables_per_word - 1.75) / 3
        
        readability = (sentence_score + syllable_score) / 2
        
        return max(0, min(1, readability))
    
    def _generate_test_queries(self, doc: ProcessedDocument) -> List[str]:
        """Generate test queries based on document content"""
        queries = []
        
        # Extract key topics from document
        topics = []
        
        # From title
        if doc.metadata.title:
            topics.extend(doc.metadata.title.split())
        
        # From key points
        if doc.structured_content.get('key_points'):
            for point in doc.structured_content['key_points'][:3]:
                # Extract nouns (simplified)
                nouns = [word for word in point.split() 
                        if word[0].isupper() and len(word) > 3]
                topics.extend(nouns[:2])
        
        # From section titles
        sections = doc.structured_content.get('sections', [])
        for section in sections[:3]:
            if section.get('title'):
                topics.extend(section['title'].split()[:2])
        
        # Generate queries from templates
        for template in self.test_query_templates[:5]:
            if '{topic}' in template and topics:
                topic = random.choice(topics)
                queries.append(template.format(topic=topic))
            elif '{feature}' in template and topics:
                feature = random.choice(topics)
                queries.append(template.format(feature=feature))
            elif '{process}' in template and topics:
                process = random.choice(topics)
                queries.append(template.format(process=process))
        
        # Add some specific queries based on content
        if doc.classification.metadata.content_category.value == 'faq':
            queries.append("Was sind häufige Fragen?")
        elif doc.classification.metadata.content_category.value == 'manual':
            queries.append("Wie verwende ich das System?")
        elif doc.classification.metadata.content_category.value == 'api_documentation':
            queries.append("Welche API-Endpunkte gibt es?")
        
        return queries[:8]  # Limit to 8 queries
    
    def _define_expected_results(self, doc: ProcessedDocument, 
                               queries: List[str]) -> List[str]:
        """Define expected results for test queries"""
        expected = []
        
        # For each query, find relevant content in document
        for query in queries:
            query_lower = query.lower()
            
            # Search in sections
            relevant_sections = []
            for section in doc.structured_content.get('sections', []):
                title = section.get('title', '').lower()
                content = section.get('content', '').lower()
                
                # Simple keyword matching
                query_words = set(query_lower.split())
                title_words = set(title.split())
                content_words = set(content.split()[:50])  # First 50 words
                
                if query_words & title_words:
                    relevant_sections.append(section.get('title', ''))
                elif len(query_words & content_words) >= 2:
                    relevant_sections.append(section.get('title', ''))
            
            if relevant_sections:
                expected.extend(relevant_sections[:2])
            else:
                expected.append(doc.metadata.title or "Document")
        
        return expected
    
    def _simulate_retrieval(self, query: str, doc: ProcessedDocument) -> List[str]:
        """Simulate retrieval results (in real implementation, use actual RAG)"""
        results = []
        
        # Simple simulation based on keyword matching
        query_words = set(query.lower().split())
        
        # Check sections
        for section in doc.structured_content.get('sections', []):
            title_words = set(section.get('title', '').lower().split())
            if query_words & title_words:
                results.append(section.get('title', ''))
        
        # Check key points
        for point in doc.structured_content.get('key_points', [])[:3]:
            point_words = set(point.lower().split())
            if len(query_words & point_words) >= 2:
                results.append(point[:50] + "...")
        
        # If no results, return document title
        if not results:
            results.append(doc.metadata.title or "Document content")
        
        return results[:3]  # Limit to top 3 results
    
    def _calculate_retrieval_metrics(self, expected: List[str], 
                                   actual: List[str]) -> Tuple[float, float, float]:
        """Calculate precision, recall, and F1 score"""
        if not expected and not actual:
            return 1.0, 1.0, 1.0
        
        if not expected or not actual:
            return 0.0, 0.0, 0.0
        
        # Normalize for comparison
        expected_set = set(e.lower().strip() for e in expected)
        actual_set = set(a.lower().strip() for a in actual)
        
        # Calculate metrics
        true_positives = len(expected_set & actual_set)
        false_positives = len(actual_set - expected_set)
        false_negatives = len(expected_set - actual_set)
        
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        return precision, recall, f1
    
    def _identify_quality_issues(self, doc: ProcessedDocument, 
                               quality_score: QualityScore,
                               accuracy_test: AccuracyTest) -> List[Dict[str, Any]]:
        """Identify specific quality issues"""
        issues = []
        
        # Check quality thresholds
        if quality_score.overall_score < self.quality_thresholds['min_overall_score']:
            issues.append({
                'type': 'low_quality',
                'severity': 'high',
                'description': f'Overall quality score {quality_score.overall_score:.2f} below threshold',
                'affected_area': 'overall'
            })
        
        if quality_score.extraction_quality < self.quality_thresholds['min_extraction_quality']:
            issues.append({
                'type': 'poor_extraction',
                'severity': 'high',
                'description': 'Content extraction quality below acceptable level',
                'affected_area': 'extraction'
            })
        
        if quality_score.structure_quality < self.quality_thresholds['min_structure_quality']:
            issues.append({
                'type': 'poor_structure',
                'severity': 'medium',
                'description': 'Document lacks clear structure',
                'affected_area': 'structure'
            })
        
        if quality_score.metadata_quality < self.quality_thresholds['min_metadata_quality']:
            issues.append({
                'type': 'incomplete_metadata',
                'severity': 'low',
                'description': 'Missing or incomplete metadata',
                'affected_area': 'metadata'
            })
        
        # Check retrieval accuracy
        if accuracy_test.f1_score < self.quality_thresholds['min_retrieval_accuracy']:
            issues.append({
                'type': 'poor_retrieval',
                'severity': 'high',
                'description': f'Retrieval F1 score {accuracy_test.f1_score:.2f} below threshold',
                'affected_area': 'retrieval'
            })
        
        # Check specific extraction issues
        if doc.tables and quality_score.details.get('table_quality', 1.0) < 0.7:
            issues.append({
                'type': 'table_issues',
                'severity': 'medium',
                'description': 'Tables have quality issues (missing headers, inconsistent rows)',
                'affected_area': 'tables'
            })
        
        if doc.code_snippets and quality_score.details.get('code_quality', 1.0) < 0.7:
            issues.append({
                'type': 'code_issues',
                'severity': 'low',
                'description': 'Code snippets lack proper language detection or documentation',
                'affected_area': 'code'
            })
        
        return issues
    
    def _measure_performance_metrics(self, doc: ProcessedDocument) -> Dict[str, float]:
        """Measure performance metrics"""
        metrics = {
            'processing_time': doc.processing_time,
            'word_count': doc.statistics.get('text', {}).get('words', 0),
            'table_count': len(doc.tables),
            'code_count': len(doc.code_snippets),
            'reference_count': len(doc.references),
            'section_count': len(doc.structured_content.get('sections', [])),
        }
        
        # Calculate throughput (words per second)
        if doc.processing_time > 0:
            metrics['throughput'] = metrics['word_count'] / doc.processing_time
        else:
            metrics['throughput'] = 0
        
        # Estimate memory usage (very rough estimate)
        content_size = len(doc.content.encode('utf-8'))
        table_size = sum(len(str(t.headers)) + len(str(t.rows)) for t in doc.tables)
        code_size = sum(len(s.code) for s in doc.code_snippets)
        
        metrics['estimated_memory_mb'] = (content_size + table_size + code_size) / (1024 * 1024)
        
        return metrics
    
    def _generate_recommendations(self, doc: ProcessedDocument,
                                quality_score: QualityScore,
                                accuracy_test: AccuracyTest,
                                issues: List[Dict[str, Any]],
                                performance_metrics: Dict[str, float]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Based on quality score
        if quality_score.overall_score < 0.8:
            if quality_score.structure_quality < 0.7:
                recommendations.append(
                    "Verbessern Sie die Dokumentstruktur durch klare Überschriften und Hierarchien"
                )
            
            if quality_score.metadata_quality < 0.7:
                recommendations.append(
                    "Ergänzen Sie fehlende Metadaten wie Version, Autoren und Keywords"
                )
            
            if quality_score.readability_score < 0.6:
                recommendations.append(
                    "Vereinfachen Sie komplexe Sätze und verwenden Sie klarere Sprache"
                )
        
        # Based on retrieval accuracy
        if accuracy_test.f1_score < 0.75:
            recommendations.append(
                "Fügen Sie mehr kontextuelle Informationen und Schlüsselwörter hinzu"
            )
            recommendations.append(
                "Strukturieren Sie Inhalte in kleinere, fokussierte Abschnitte"
            )
        
        # Based on specific issues
        high_severity_issues = [i for i in issues if i['severity'] == 'high']
        if high_severity_issues:
            recommendations.append(
                f"Beheben Sie {len(high_severity_issues)} kritische Qualitätsprobleme"
            )
        
        # Performance recommendations
        if performance_metrics.get('processing_time', 0) > 5.0:
            recommendations.append(
                "Erwägen Sie, große Dokumente in kleinere Teile aufzuteilen"
            )
        
        if performance_metrics.get('throughput', 0) < 100:  # words/second
            recommendations.append(
                "Optimieren Sie den Dokumentinhalt für schnellere Verarbeitung"
            )
        
        # Limit recommendations
        return recommendations[:5]
    
    def _identify_missing_metadata(self, metadata: Any) -> List[str]:
        """Identify missing metadata fields"""
        missing = []
        
        important_fields = {
            'title': 'Titel',
            'version': 'Version',
            'authors': 'Autoren',
            'date': 'Datum',
            'keywords': 'Schlüsselwörter',
            'summary': 'Zusammenfassung',
            'language': 'Sprache'
        }
        
        for field, label in important_fields.items():
            value = getattr(metadata, field, None)
            if not value or (isinstance(value, list) and len(value) == 0):
                missing.append(label)
        
        return missing
    
    def monitor_quality_trends(self, reports: List[QualityReport]) -> Dict[str, Any]:
        """Monitor quality trends over time"""
        if not reports:
            return {}
        
        # Sort by timestamp
        reports_sorted = sorted(reports, key=lambda r: r.timestamp)
        
        # Calculate trends
        quality_scores = [r.quality_score.overall_score for r in reports_sorted]
        retrieval_scores = [r.accuracy_tests[0].f1_score for r in reports_sorted 
                          if r.accuracy_tests]
        
        trends = {
            'quality_trend': self._calculate_trend(quality_scores),
            'retrieval_trend': self._calculate_trend(retrieval_scores),
            'avg_quality': statistics.mean(quality_scores) if quality_scores else 0,
            'avg_retrieval': statistics.mean(retrieval_scores) if retrieval_scores else 0,
            'quality_improvement': quality_scores[-1] - quality_scores[0] if len(quality_scores) > 1 else 0,
            'total_issues': sum(len(r.issues_found) for r in reports),
            'common_issues': self._find_common_issues(reports)
        }
        
        return trends
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction"""
        if len(values) < 2:
            return 'stable'
        
        # Simple linear regression slope
        n = len(values)
        x = list(range(n))
        
        x_mean = sum(x) / n
        y_mean = sum(values) / n
        
        numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return 'stable'
        
        slope = numerator / denominator
        
        if slope > 0.01:
            return 'improving'
        elif slope < -0.01:
            return 'declining'
        else:
            return 'stable'
    
    def _find_common_issues(self, reports: List[QualityReport]) -> List[Dict[str, Any]]:
        """Find most common issues across reports"""
        issue_counts = defaultdict(int)
        
        for report in reports:
            for issue in report.issues_found:
                issue_key = f"{issue['type']}_{issue['severity']}"
                issue_counts[issue_key] += 1
        
        # Sort by frequency
        common_issues = []
        for issue_key, count in sorted(issue_counts.items(), 
                                     key=lambda x: x[1], reverse=True)[:5]:
            issue_type, severity = issue_key.split('_')
            common_issues.append({
                'type': issue_type,
                'severity': severity,
                'frequency': count,
                'percentage': (count / len(reports)) * 100 if reports else 0
            })
        
        return common_issues


def create_quality_assurance(knowledge_manager: Optional[KnowledgeManager] = None,
                           config: Optional[Dict[str, Any]] = None) -> QualityAssurance:
    """Factory function to create quality assurance system"""
    return QualityAssurance(knowledge_manager, config)


if __name__ == "__main__":
    # Example usage
    import sys
    from ..doc_converter import DocumentClassifier
    from doc_converter.processing import EnhancedProcessor
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        
        # Process document
        classifier = DocumentClassifier()
        processor = EnhancedProcessor()
        qa_system = create_quality_assurance()
        
        classification = classifier.classify_document(file_path)
        processed_doc = processor.process_document(file_path, classification)
        
        # Generate quality report
        report = qa_system.generate_quality_report(processed_doc)
        
        print(f"\n📊 Quality Assurance Report")
        print(f"{'='*60}")
        print(f"Document: {report.document_id}")
        print(f"\n📈 Quality Scores:")
        print(f"  - Overall: {report.quality_score.overall_score:.2f}")
        print(f"  - Extraction: {report.quality_score.extraction_quality:.2f}")
        print(f"  - Structure: {report.quality_score.structure_quality:.2f}")
        print(f"  - Metadata: {report.quality_score.metadata_quality:.2f}")
        print(f"  - Readability: {report.quality_score.readability_score:.2f}")
        
        if report.accuracy_tests:
            print(f"\n🎯 Retrieval Accuracy:")
            test = report.accuracy_tests[0]
            print(f"  - Precision: {test.precision:.2f}")
            print(f"  - Recall: {test.recall:.2f}")
            print(f"  - F1 Score: {test.f1_score:.2f}")
            print(f"  - Avg Response Time: {test.avg_response_time:.3f}s")
        
        if report.issues_found:
            print(f"\n⚠️  Issues Found ({len(report.issues_found)}):")
            for issue in report.issues_found:
                print(f"  - [{issue['severity'].upper()}] {issue['description']}")
        
        if report.recommendations:
            print(f"\n💡 Recommendations:")
            for i, rec in enumerate(report.recommendations, 1):
                print(f"  {i}. {rec}")
        
        # Generate improvement suggestions
        suggestions = qa_system.suggest_improvements(processed_doc)
        if suggestions:
            print(f"\n🔧 Improvement Suggestions:")
            for suggestion in suggestions:
                print(f"  - [{suggestion.priority.upper()}] {suggestion.suggestion}")
                print(f"    Expected impact: +{suggestion.expected_impact:.0%} quality")
    else:
        print("Usage: python quality_assurance.py <file_path>")