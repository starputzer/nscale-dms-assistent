"""
Tests for Enhanced Document Classifier
"""

import os
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
import unittest
from unittest.mock import patch, MagicMock
import json

# Add parent directories to path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

from modules.doc_converter.document_classifier import (
    DocumentClassifier,
    DocumentType,
    ContentCategory,
    StructureType,
    ProcessingStrategy,
    DocumentMetadata,
    ClassificationResult,
    batch_classify_documents
)


class TestDocumentClassifier(unittest.TestCase):
    """Test cases for DocumentClassifier"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.classifier = DocumentClassifier()
        self.test_dir = tempfile.mkdtemp()
        
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def create_test_file(self, filename: str, content: str = "") -> str:
        """Helper to create test files"""
        file_path = os.path.join(self.test_dir, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return file_path
    
    def test_document_type_detection_by_extension(self):
        """Test document type detection based on file extension"""
        test_cases = [
            ('test.pdf', DocumentType.PDF),
            ('test.docx', DocumentType.DOCX),
            ('test.doc', DocumentType.DOCX),
            ('test.txt', DocumentType.TXT),
            ('test.html', DocumentType.HTML),
            ('test.htm', DocumentType.HTML),
            ('test.md', DocumentType.MARKDOWN),
            ('test.markdown', DocumentType.MARKDOWN),
            ('test.xlsx', DocumentType.XLSX),
            ('test.xls', DocumentType.XLSX),
            ('test.pptx', DocumentType.PPTX),
            ('test.ppt', DocumentType.PPTX),
            ('test.rtf', DocumentType.RTF),
            ('test.csv', DocumentType.CSV),
            ('test.xml', DocumentType.XML),
            ('test.json', DocumentType.JSON),
            ('test.unknown', DocumentType.UNKNOWN),
        ]
        
        for filename, expected_type in test_cases:
            with self.subTest(filename=filename):
                file_path = self.create_test_file(filename)
                doc_type = self.classifier._detect_document_type(Path(file_path))
                self.assertEqual(doc_type, expected_type)
    
    def test_content_category_detection(self):
        """Test content category detection based on content and filename"""
        test_cases = [
            # Filename-based detection
            ('benutzerhandbuch.pdf', '', ContentCategory.MANUAL),
            ('user_manual.pdf', '', ContentCategory.MANUAL),
            ('faq.docx', '', ContentCategory.FAQ),
            ('installation_guide.pdf', '', ContentCategory.CONFIGURATION),
            ('api_reference.html', '', ContentCategory.API_DOCUMENTATION),
            ('troubleshooting.md', '', ContentCategory.TROUBLESHOOTING),
            ('release_notes_v2.txt', '', ContentCategory.RELEASE_NOTES),
            ('technical_specification.pdf', '', ContentCategory.TECHNICAL_SPEC),
            ('admin_guide.docx', '', ContentCategory.ADMIN_GUIDE),
            
            # Content-based detection
            ('doc1.txt', 'Dies ist ein Benutzerhandbuch für nscale', ContentCategory.MANUAL),
            ('doc2.txt', 'Frequently Asked Questions\nQ: How to...', ContentCategory.FAQ),
            ('doc3.txt', 'API Endpoints:\n/api/users\n/api/documents', ContentCategory.API_DOCUMENTATION),
            ('doc4.txt', 'Fehlerbehebung:\nProblem: Login funktioniert nicht', ContentCategory.TROUBLESHOOTING),
            ('doc5.txt', 'Installation und Konfiguration des Servers', ContentCategory.CONFIGURATION),
        ]
        
        for filename, content, expected_category in test_cases:
            with self.subTest(filename=filename):
                file_path = self.create_test_file(filename, content)
                result = self.classifier.classify_document(file_path)
                self.assertEqual(result.metadata.content_category, expected_category)
    
    def test_structure_type_detection(self):
        """Test document structure type detection"""
        test_cases = [
            # Hierarchical structure
            ('hierarchical.md', '# Chapter 1\n## Section 1.1\n### Subsection 1.1.1\nContent here', StructureType.HIERARCHICAL),
            ('numbered.txt', '1. Introduction\n1.1 Overview\n1.2 Background\n2. Main Content', StructureType.HIERARCHICAL),
            
            # Q&A Format
            ('qa.txt', 'Q: What is nscale?\nA: nscale is a DMS system\nQ: How to install?\nA: Follow these steps...', StructureType.QA_FORMAT),
            ('faq_format.txt', 'Question: How do I login?\nAnswer: Use your credentials\nQuestion: What if I forget?', StructureType.QA_FORMAT),
            
            # List-based
            ('list.txt', '- Item 1\n- Item 2\n- Item 3\n- Item 4\n- Item 5\n- Item 6\n- Item 7\n- Item 8\n- Item 9\n- Item 10\n- Item 11', StructureType.LIST_BASED),
            ('numbered_list.txt', '1. First item\n2. Second item\n3. Third item\n4. Fourth\n5. Fifth\n6. Sixth\n7. Seventh\n8. Eighth\n9. Ninth\n10. Tenth\n11. Eleventh', StructureType.LIST_BASED),
            
            # Mixed structure
            ('mixed.txt', '# Title\nSome content\n- List item\nQ: Question?\nA: Answer', StructureType.MIXED),
            
            # Unstructured
            ('plain.txt', 'This is just plain text without any special formatting or structure.', StructureType.UNSTRUCTURED),
        ]
        
        for filename, content, expected_structure in test_cases:
            with self.subTest(filename=filename):
                file_path = self.create_test_file(filename, content)
                result = self.classifier.classify_document(file_path)
                self.assertEqual(result.metadata.structure_type, expected_structure)
    
    def test_processing_strategy_determination(self):
        """Test processing strategy determination"""
        test_cases = [
            # Document type based strategies
            (DocumentType.XLSX, ContentCategory.GENERAL, StructureType.TABULAR, ProcessingStrategy.TABLE_OPTIMIZED),
            (DocumentType.CSV, ContentCategory.GENERAL, StructureType.TABULAR, ProcessingStrategy.TABLE_OPTIMIZED),
            
            # Structure based strategies
            (DocumentType.MARKDOWN, ContentCategory.GENERAL, StructureType.HIERARCHICAL, ProcessingStrategy.HIERARCHICAL_PRESERVE),
            (DocumentType.HTML, ContentCategory.GENERAL, StructureType.HIERARCHICAL, ProcessingStrategy.HIERARCHICAL_PRESERVE),
            
            # Content category based strategies
            (DocumentType.TXT, ContentCategory.FAQ, StructureType.QA_FORMAT, ProcessingStrategy.QA_EXTRACTION),
            (DocumentType.DOCX, ContentCategory.API_DOCUMENTATION, StructureType.MIXED, ProcessingStrategy.CODE_AWARE),
            (DocumentType.PDF, ContentCategory.TECHNICAL_SPEC, StructureType.MIXED, ProcessingStrategy.DEEP_ANALYSIS),
            
            # Default strategy
            (DocumentType.TXT, ContentCategory.GENERAL, StructureType.UNSTRUCTURED, ProcessingStrategy.STANDARD),
        ]
        
        for doc_type, content_cat, struct_type, expected_strategy in test_cases:
            with self.subTest(doc_type=doc_type, content_cat=content_cat, struct_type=struct_type):
                strategy = self.classifier.determine_processing_strategy(doc_type, content_cat, struct_type)
                self.assertEqual(strategy, expected_strategy)
    
    def test_language_detection(self):
        """Test language detection functionality"""
        test_cases = [
            ('german.txt', 'Dies ist ein deutscher Text mit vielen Wörtern auf Deutsch. '
             'Die Dokumentation beschreibt die Funktionsweise des Systems.', 'de'),
            ('english.txt', 'This is an English text with many words in English. '
             'The documentation describes how the system works.', 'en'),
        ]
        
        # Skip if langdetect is not available
        try:
            from langdetect import detect
            for filename, content, expected_lang in test_cases:
                with self.subTest(filename=filename):
                    file_path = self.create_test_file(filename, content)
                    result = self.classifier.classify_document(file_path)
                    self.assertEqual(result.metadata.language, expected_lang)
        except ImportError:
            self.skipTest("langdetect not available")
    
    def test_metadata_extraction(self):
        """Test extraction of metadata from document content"""
        content = """
        Version: 2.5.1
        Date: 2024-01-15
        
        # User Manual
        
        ```python
        def example():
            return "code block"
        ```
        
        | Column 1 | Column 2 |
        |----------|----------|
        | Data 1   | Data 2   |
        """
        
        file_path = self.create_test_file('metadata_test.md', content)
        result = self.classifier.classify_document(file_path)
        
        # Check extracted metadata
        self.assertEqual(result.metadata.extracted_metadata.get('version'), '2.5.1')
        self.assertIn('document_date', result.metadata.extracted_metadata)
        self.assertEqual(result.metadata.extracted_metadata.get('code_blocks'), 1)
        self.assertTrue(result.metadata.extracted_metadata.get('has_tables'))
    
    def test_priority_calculation(self):
        """Test priority score calculation"""
        test_cases = [
            (ContentCategory.USER_GUIDE, 100_000, StructureType.HIERARCHICAL),
            (ContentCategory.FAQ, 50_000, StructureType.QA_FORMAT),
            (ContentCategory.API_DOCUMENTATION, 1_000_000, StructureType.MIXED),
            (ContentCategory.GENERAL, 20_000_000, StructureType.UNSTRUCTURED),
        ]
        
        for content_cat, file_size, struct_type in test_cases:
            with self.subTest(content_cat=content_cat, file_size=file_size):
                # Create a mock metadata object
                metadata = DocumentMetadata(
                    filename="test.txt",
                    file_path="/test/path",
                    file_size=file_size,
                    document_type=DocumentType.TXT,
                    mime_type="text/plain",
                    content_category=content_cat,
                    structure_type=struct_type,
                    language="de",
                    encoding="utf-8",
                    created_at=datetime.now(),
                    modified_at=datetime.now(),
                    file_hash="abc123"
                )
                
                priority = self.classifier._calculate_priority(metadata)
                
                # Priority should be between 0 and 1
                self.assertGreaterEqual(priority, 0.0)
                self.assertLessEqual(priority, 1.0)
                
                # User guides should have highest priority
                if content_cat == ContentCategory.USER_GUIDE:
                    self.assertGreater(priority, 0.8)
                # General content should have lower priority
                elif content_cat == ContentCategory.GENERAL:
                    self.assertLess(priority, 0.6)
    
    def test_processing_time_estimation(self):
        """Test processing time estimation"""
        test_cases = [
            (DocumentType.TXT, 100_000, 0.5),  # Small text file
            (DocumentType.PDF, 5_000_000, 75),  # Medium PDF
            (DocumentType.XLSX, 10_000_000, 200),  # Large Excel
        ]
        
        for doc_type, file_size, max_expected_time in test_cases:
            with self.subTest(doc_type=doc_type, file_size=file_size):
                metadata = DocumentMetadata(
                    filename="test",
                    file_path="/test",
                    file_size=file_size,
                    document_type=doc_type,
                    mime_type="application/octet-stream",
                    content_category=ContentCategory.GENERAL,
                    structure_type=StructureType.UNSTRUCTURED,
                    language="de",
                    encoding="utf-8",
                    created_at=datetime.now(),
                    modified_at=datetime.now(),
                    file_hash="abc123"
                )
                
                time_estimate = self.classifier._estimate_processing_time(metadata)
                
                # Time should be positive and reasonable
                self.assertGreater(time_estimate, 0)
                self.assertLessEqual(time_estimate, 300)  # Max 5 minutes
                self.assertLessEqual(time_estimate, max_expected_time)
    
    def test_recommendations_generation(self):
        """Test generation of warnings and recommendations"""
        # Large file test
        large_metadata = DocumentMetadata(
            filename="large.pdf",
            file_path="/test/large.pdf",
            file_size=60_000_000,  # 60MB
            document_type=DocumentType.PDF,
            mime_type="application/pdf",
            content_category=ContentCategory.GENERAL,
            structure_type=StructureType.UNSTRUCTURED,
            language="de",
            encoding="utf-8",
            created_at=datetime.now(),
            modified_at=datetime.now(),
            file_hash="abc123"
        )
        
        warnings, recommendations = self.classifier._generate_recommendations(large_metadata)
        self.assertIn("Large file size", warnings[0])
        self.assertIn("splitting", recommendations[0])
        
        # Unknown document type test
        unknown_metadata = DocumentMetadata(
            filename="unknown.xyz",
            file_path="/test/unknown.xyz",
            file_size=1000,
            document_type=DocumentType.UNKNOWN,
            mime_type="unknown",
            content_category=ContentCategory.GENERAL,
            structure_type=StructureType.UNSTRUCTURED,
            language="de",
            encoding="utf-8",
            created_at=datetime.now(),
            modified_at=datetime.now(),
            file_hash="abc123"
        )
        
        warnings, recommendations = self.classifier._generate_recommendations(unknown_metadata)
        self.assertIn("Unknown document type", warnings[0])
        self.assertIn("Convert to a supported format", recommendations[0])
    
    def test_batch_classification(self):
        """Test batch classification of multiple documents"""
        # Create test files
        file_paths = []
        for i in range(3):
            content = f"Test document {i}\nThis is a test manual."
            file_path = self.create_test_file(f'test_{i}.txt', content)
            file_paths.append(file_path)
        
        # Add one non-existent file to test error handling
        file_paths.append('/non/existent/file.txt')
        
        # Classify batch
        results = batch_classify_documents(file_paths)
        
        # Check results
        self.assertEqual(len(results), 4)
        
        # First 3 should succeed
        for i in range(3):
            self.assertEqual(results[i].metadata.document_type, DocumentType.TXT)
            self.assertGreater(results[i].priority_score, 0)
            self.assertEqual(len(results[i].warnings), 0)
        
        # Last one should have error
        self.assertEqual(results[3].metadata.document_type, DocumentType.UNKNOWN)
        self.assertEqual(results[3].priority_score, 0.0)
        self.assertGreater(len(results[3].warnings), 0)
    
    def test_file_hash_calculation(self):
        """Test file hash calculation"""
        content = "Test content for hashing"
        file_path = self.create_test_file('hash_test.txt', content)
        
        result = self.classifier.classify_document(file_path)
        
        # Hash should be a 64-character hex string (SHA-256)
        self.assertEqual(len(result.metadata.file_hash), 64)
        self.assertTrue(all(c in '0123456789abcdef' for c in result.metadata.file_hash))
        
        # Same content should produce same hash
        file_path2 = self.create_test_file('hash_test2.txt', content)
        result2 = self.classifier.classify_document(file_path2)
        self.assertEqual(result.metadata.file_hash, result2.metadata.file_hash)
    
    def test_complete_classification_workflow(self):
        """Test complete classification workflow with a realistic document"""
        content = """
        # nscale Benutzerhandbuch
        Version: 3.0.1
        Datum: Januar 2024
        
        ## Inhaltsverzeichnis
        1. Einführung
        2. Installation
        3. Konfiguration
        4. Benutzung
        
        ## 1. Einführung
        
        nscale ist ein modernes Dokumentenmanagementsystem (DMS), das...
        
        ### 1.1 Systemanforderungen
        
        - Betriebssystem: Windows 10/11, Linux
        - RAM: mindestens 8GB
        - Festplatte: 100GB freier Speicherplatz
        
        ## 2. Installation
        
        ```bash
        # Installation unter Linux
        sudo apt-get update
        sudo apt-get install nscale
        ```
        
        ## 3. Konfiguration
        
        | Parameter | Standardwert | Beschreibung |
        |-----------|--------------|--------------|
        | port      | 8080         | Server-Port  |
        | database  | postgres     | Datenbank    |
        
        ## FAQ
        
        **Q: Wie kann ich mich anmelden?**
        A: Verwenden Sie Ihre Firmenzugangsdaten.
        
        **Q: Was tun bei Problemen?**
        A: Kontaktieren Sie den Support.
        """
        
        file_path = self.create_test_file('nscale_manual.md', content)
        result = self.classifier.classify_document(file_path)
        
        # Verify comprehensive classification
        self.assertEqual(result.metadata.document_type, DocumentType.MARKDOWN)
        self.assertEqual(result.metadata.content_category, ContentCategory.MANUAL)
        self.assertEqual(result.metadata.structure_type, StructureType.HIERARCHICAL)
        self.assertEqual(result.metadata.language, 'de')
        self.assertEqual(result.processing_strategy, ProcessingStrategy.HIERARCHICAL_PRESERVE)
        
        # Check metadata extraction
        self.assertEqual(result.metadata.extracted_metadata.get('version'), '3.0.1')
        self.assertIn('document_date', result.metadata.extracted_metadata)
        self.assertEqual(result.metadata.extracted_metadata.get('code_blocks'), 1)
        self.assertTrue(result.metadata.extracted_metadata.get('has_tables'))
        
        # Check priority and time estimation
        self.assertGreater(result.priority_score, 0.8)  # Manuals have high priority
        self.assertGreater(result.estimated_processing_time, 0)
        
        # Check for processing hints
        self.assertIn("Contains 1 code blocks", result.metadata.processing_hints)
        self.assertIn("Contains table structures", result.metadata.processing_hints)


class TestDocumentClassifierIntegration(unittest.TestCase):
    """Integration tests for DocumentClassifier with other components"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.classifier = DocumentClassifier()
    
    def tearDown(self):
        """Clean up test environment"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_classifier_with_json_config(self):
        """Test classifier with JSON configuration"""
        config = {
            'priority_matrix': {
                ('CustomCategory', 'Simple'): 1,
                ('CustomCategory', 'Complex'): 3,
            },
            'content_keywords': {
                'CustomCategory': ['custom', 'special', 'unique']
            }
        }
        
        classifier = DocumentClassifier(config)
        self.assertIsNotNone(classifier)
        # Config should be applied
        self.assertEqual(classifier.config, config)
    
    def test_error_handling_nonexistent_file(self):
        """Test error handling for non-existent files"""
        with self.assertRaises(FileNotFoundError):
            self.classifier.classify_document('/non/existent/file.xyz')
    
    def test_error_handling_invalid_permissions(self):
        """Test error handling for files with invalid permissions"""
        # This test would require OS-specific permission manipulation
        # Skipping for now as it's platform-dependent
        pass


if __name__ == '__main__':
    unittest.main(verbosity=2)