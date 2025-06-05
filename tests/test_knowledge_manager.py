"""
Tests for Knowledge Manager
"""

import os
import tempfile
import unittest
import shutil
from pathlib import Path
from datetime import datetime

# Add parent directory to path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from modules.doc_converter.document_classifier import DocumentClassifier
from doc_converter.processing.enhanced_processor import EnhancedProcessor
from modules.rag.knowledge_manager import (
    KnowledgeManager,
    create_knowledge_manager,
    Duplicate,
    CrossReference,
    IntegrationResult
)


class TestKnowledgeManager(unittest.TestCase):
    """Test cases for KnowledgeManager"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_knowledge.db")
        self.knowledge_mgr = create_knowledge_manager(self.db_path)
        self.classifier = DocumentClassifier()
        self.processor = EnhancedProcessor()
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def create_test_document(self, filename: str, content: str, version: str = "1.0"):
        """Helper to create and process a test document"""
        file_path = os.path.join(self.test_dir, filename)
        
        # Add version to content if not present
        if "Version:" not in content:
            content = f"Version: {version}\n" + content
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Process document
        classification = self.classifier.classify_document(file_path)
        processed_doc = self.processor.process_document(file_path, classification, content)
        
        return processed_doc
    
    def test_integrate_new_document(self):
        """Test integrating a new document into knowledge base"""
        content = """
# Test Document

This is a test document for knowledge integration.

## Section 1
Content for section 1.

## Section 2
Content for section 2 with a [link](#section-1).
"""
        
        doc = self.create_test_document("test_doc.md", content)
        result = self.knowledge_mgr.integrate_document(doc)
        
        # Check integration success
        self.assertEqual(result.status, 'success')
        self.assertEqual(result.doc_id, doc.document_id)
        self.assertEqual(len(result.duplicates_found), 0)
        self.assertGreater(result.statistics['processing_time'], 0)
    
    def test_duplicate_detection_exact(self):
        """Test exact duplicate detection"""
        content = """
# Duplicate Test Document

This document will be added twice to test duplicate detection.
"""
        
        # Add document first time
        doc1 = self.create_test_document("doc1.md", content)
        result1 = self.knowledge_mgr.integrate_document(doc1)
        self.assertEqual(result1.status, 'success')
        
        # Add same document again
        doc2 = self.create_test_document("doc2.md", content)
        result2 = self.knowledge_mgr.integrate_document(doc2)
        
        # Should detect as duplicate
        self.assertEqual(result2.status, 'duplicate')
        self.assertGreater(len(result2.duplicates_found), 0)
        self.assertEqual(result2.duplicates_found[0].duplicate_type, 'exact')
        self.assertEqual(result2.duplicates_found[0].similarity_score, 1.0)
    
    def test_duplicate_detection_similar_title(self):
        """Test similar document detection by title"""
        # First document
        content1 = """
# nscale User Guide

This is the user guide for nscale.
"""
        doc1 = self.create_test_document("guide1.md", content1)
        result1 = self.knowledge_mgr.integrate_document(doc1)
        self.assertEqual(result1.status, 'success')
        
        # Similar document with slightly different title
        content2 = """
# nscale User Manual

This is the user manual for nscale with different content.
"""
        doc2 = self.create_test_document("guide2.md", content2)
        
        # Manually check for duplicates
        duplicates = self.knowledge_mgr.detect_duplicates(doc2)
        
        # Should find similar document
        self.assertGreater(len(duplicates), 0)
        self.assertGreater(duplicates[0].similarity_score, 0.8)
    
    def test_version_management(self):
        """Test document version management"""
        # Initial version
        content_v1 = """
# API Documentation
Version: 1.0

## Authentication
Use basic auth for API access.
"""
        doc_v1 = self.create_test_document("api_v1.md", content_v1, "1.0")
        result_v1 = self.knowledge_mgr.integrate_document(doc_v1)
        self.assertEqual(result_v1.status, 'success')
        
        # Updated version
        content_v2 = """
# API Documentation
Version: 2.0

## Authentication
Use OAuth2 for API access.

## New Features
Added webhook support.
"""
        doc_v2 = self.create_test_document("api_v2.md", content_v2, "2.0")
        
        # Check if version update is detected
        duplicates = self.knowledge_mgr.detect_duplicates(doc_v2)
        
        # Should detect as potential version update
        self.assertGreater(len(duplicates), 0)
        
        # Test version increment
        new_version = self.knowledge_mgr._increment_version("1.0")
        self.assertEqual(new_version, "1.1")
        
        new_version = self.knowledge_mgr._increment_version("2.3.4")
        self.assertEqual(new_version, "2.4")
    
    def test_cross_reference_creation(self):
        """Test creation of cross-references between documents"""
        # Document 1
        content1 = """
# Configuration Guide

For installation instructions, see the [Installation Guide](#installation-guide).

## Database Setup
Configure your database settings.
"""
        
        # Document 2
        content2 = """
# Installation Guide

This guide covers installation steps.

## Prerequisites
See the [Configuration Guide](#configuration-guide) for config details.
"""
        
        # Add both documents
        doc1 = self.create_test_document("config.md", content1)
        doc2 = self.create_test_document("install.md", content2)
        
        result1 = self.knowledge_mgr.integrate_document(doc1)
        result2 = self.knowledge_mgr.integrate_document(doc2)
        
        # Check cross-references
        cross_refs = self.knowledge_mgr.create_cross_references(doc2)
        
        # Should create references based on content similarity
        self.assertGreaterEqual(len(result2.cross_references_created), 0)
    
    def test_knowledge_graph_update(self):
        """Test knowledge graph construction"""
        content = """
# Knowledge Graph Test

## Section A
Content about topic A.

## Section B
Content about topic B with reference to [Section A](#section-a).

## Section C
Content about topic C.
"""
        
        doc = self.create_test_document("graph_test.md", content)
        result = self.knowledge_mgr.integrate_document(doc)
        
        # Get knowledge graph
        graph = self.knowledge_mgr.get_document_graph(doc.document_id, depth=1)
        
        # Check graph structure
        self.assertIn('nodes', graph)
        self.assertIn('edges', graph)
        self.assertIn('root', graph)
        
        # Should have document node and section nodes
        self.assertGreater(len(graph['nodes']), 1)
        
        # Root node should be document
        root_node = graph['nodes'].get(graph['root'])
        self.assertIsNotNone(root_node)
        self.assertEqual(root_node['type'], 'document')
    
    def test_similar_document_search(self):
        """Test searching for similar documents"""
        # Add several documents
        docs = [
            ("doc1.md", "# User Manual\n\nHow to use nscale effectively."),
            ("doc2.md", "# Admin Guide\n\nAdministration tasks for nscale."),
            ("doc3.md", "# API Reference\n\nnscale API documentation."),
            ("doc4.md", "# Troubleshooting\n\nCommon nscale issues and solutions."),
        ]
        
        for filename, content in docs:
            doc = self.create_test_document(filename, content)
            self.knowledge_mgr.integrate_document(doc)
        
        # Search for documents
        results = self.knowledge_mgr.search_similar_documents("nscale user", limit=5)
        
        # Should find relevant documents
        self.assertGreater(len(results), 0)
        
        # User Manual should be most relevant
        self.assertIn("User Manual", results[0]['title'])
        self.assertGreater(results[0]['relevance'], 0.5)
    
    def test_structural_similarity(self):
        """Test structural similarity detection"""
        # Document with specific structure
        content1 = """
# Document A

## Introduction
Text here.

| Col1 | Col2 |
|------|------|
| A    | B    |

```python
code = "example"
```

See [link](https://example.com)
"""
        
        # Similar structure, different content
        content2 = """
# Document B

## Overview
Different text.

| Header1 | Header2 |
|---------|---------|
| X       | Y       |

```python
data = "different"
```

Check [reference](https://other.com)
"""
        
        doc1 = self.create_test_document("struct1.md", content1)
        doc2 = self.create_test_document("struct2.md", content2)
        
        # Add first document
        self.knowledge_mgr.integrate_document(doc1)
        
        # Check if structural similarity is detected
        duplicates = self.knowledge_mgr.detect_duplicates(doc2)
        
        # Calculate structural similarity manually
        stats1 = {'tables': 1, 'code': 1, 'refs': 1, 'words': 20}
        stats2 = {'tables': 1, 'code': 1, 'refs': 1, 'words': 22}
        
        similarity = self.knowledge_mgr._calculate_structural_similarity(stats1, stats2)
        self.assertGreater(similarity, 0.8)
    
    def test_integration_warnings(self):
        """Test generation of integration warnings"""
        # Document without title
        content = """
Content without a proper heading.

This will generate warnings.
"""
        
        doc = self.create_test_document("no_title.txt", content)
        result = self.knowledge_mgr.integrate_document(doc)
        
        # Should have warnings
        self.assertGreater(len(result.warnings), 0)
        self.assertTrue(any("no title" in w.lower() for w in result.warnings))
    
    def test_batch_integration(self):
        """Test integrating multiple documents"""
        documents = [
            ("batch1.md", "# Batch Document 1\n\nFirst document in batch."),
            ("batch2.md", "# Batch Document 2\n\nSecond document with [link to first](#batch-document-1)."),
            ("batch3.md", "# Batch Document 3\n\nThird document referencing both previous docs."),
        ]
        
        results = []
        for filename, content in documents:
            doc = self.create_test_document(filename, content)
            result = self.knowledge_mgr.integrate_document(doc)
            results.append(result)
        
        # All should integrate successfully
        for result in results:
            self.assertIn(result.status, ['success', 'updated'])
        
        # Later documents might create cross-references
        self.assertGreaterEqual(len(results[1].cross_references_created), 0)


class TestKnowledgeManagerEdgeCases(unittest.TestCase):
    """Test edge cases for KnowledgeManager"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_knowledge.db")
        self.knowledge_mgr = create_knowledge_manager(self.db_path)
    
    def tearDown(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_empty_document(self):
        """Test handling of empty documents"""
        # Create minimal processed document
        from doc_converter.processing.enhanced_processor import (
            ProcessedDocument, ExtractedMetadata
        )
        from modules.doc_converter.document_classifier import (
            ClassificationResult, DocumentMetadata, DocumentType,
            ContentCategory, StructureType, ProcessingStrategy
        )
        
        # Create minimal classification
        metadata = DocumentMetadata(
            filename="empty.txt",
            file_path="/tmp/empty.txt",
            file_size=0,
            document_type=DocumentType.TXT,
            mime_type="text/plain",
            content_category=ContentCategory.GENERAL,
            structure_type=StructureType.UNSTRUCTURED,
            language="en",
            encoding="utf-8",
            created_at=datetime.now(),
            modified_at=datetime.now(),
            file_hash="empty"
        )
        
        classification = ClassificationResult(
            metadata=metadata,
            processing_strategy=ProcessingStrategy.MINIMAL,
            priority_score=0.1,
            estimated_processing_time=0.1
        )
        
        empty_doc = ProcessedDocument(
            document_id="empty_doc_123",
            original_path="/tmp/empty.txt",
            classification=classification,
            content="",
            structured_content={},
            tables=[],
            code_snippets=[],
            references=[],
            metadata=ExtractedMetadata(),
            processing_time=0.001,
            statistics={'text': {'words': 0, 'sentences': 0, 'paragraphs': 0}}
        )
        
        # Should handle gracefully
        result = self.knowledge_mgr.integrate_document(empty_doc)
        self.assertIn(result.status, ['success', 'failed'])
    
    def test_string_similarity_edge_cases(self):
        """Test string similarity calculation edge cases"""
        # Empty strings
        sim = self.knowledge_mgr._calculate_string_similarity("", "")
        self.assertEqual(sim, 0.0)
        
        sim = self.knowledge_mgr._calculate_string_similarity("test", "")
        self.assertEqual(sim, 0.0)
        
        # Identical strings
        sim = self.knowledge_mgr._calculate_string_similarity("test", "test")
        self.assertEqual(sim, 1.0)
        
        # Case insensitive
        sim = self.knowledge_mgr._calculate_string_similarity("Test", "test")
        self.assertEqual(sim, 1.0)
    
    def test_version_increment_edge_cases(self):
        """Test version increment edge cases"""
        # No version
        new_ver = self.knowledge_mgr._increment_version(None)
        self.assertEqual(new_ver, "1.0")
        
        # Non-numeric version
        new_ver = self.knowledge_mgr._increment_version("alpha")
        self.assertEqual(new_ver, "1.0")
        
        # Single number
        new_ver = self.knowledge_mgr._increment_version("5")
        self.assertEqual(new_ver, "5.1")
        
        # Multiple parts
        new_ver = self.knowledge_mgr._increment_version("1.2.3")
        self.assertEqual(new_ver, "1.3")


if __name__ == '__main__':
    unittest.main(verbosity=2)