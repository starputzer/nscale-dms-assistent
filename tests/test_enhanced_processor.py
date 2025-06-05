"""
Tests for Enhanced Document Processor
"""

import os
import tempfile
import unittest
from pathlib import Path
from datetime import datetime

# Add parent directory to path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from modules.doc_converter.document_classifier import (
    DocumentClassifier,
    DocumentType,
    ContentCategory,
    StructureType,
    ProcessingStrategy
)
from doc_converter.processing.enhanced_processor import (
    EnhancedProcessor,
    TableContext,
    CodeSnippet,
    Reference,
    ExtractedMetadata,
    ProcessedDocument
)


class TestEnhancedProcessor(unittest.TestCase):
    """Test cases for EnhancedProcessor"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.processor = EnhancedProcessor()
        self.classifier = DocumentClassifier()
        self.test_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        import shutil
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def create_test_file(self, filename: str, content: str) -> str:
        """Helper to create test files"""
        file_path = os.path.join(self.test_dir, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return file_path
    
    def test_table_extraction_markdown(self):
        """Test extraction of markdown tables with context"""
        content = """
# Document with Tables

This document contains several tables for testing.

Table 1: Sample Data

| Column A | Column B | Column C |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

The table above shows sample data.

## Another Section

Table 2: Configuration Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Debug   | True  | Enable debug mode |
| Port    | 8080  | Server port |

This configuration is important.
"""
        
        file_path = self.create_test_file('tables.md', content)
        classification = self.classifier.classify_document(file_path)
        result = self.processor.process_document(file_path, classification, content)
        
        # Check tables extracted
        self.assertEqual(len(result.tables), 2)
        
        # Check first table
        table1 = result.tables[0]
        self.assertEqual(table1.headers, ['Column A', 'Column B', 'Column C'])
        self.assertEqual(len(table1.rows), 2)
        self.assertEqual(table1.rows[0], ['Data 1', 'Data 2', 'Data 3'])
        self.assertIn('Sample Data', table1.caption or table1.preceding_text)
        
        # Check second table
        table2 = result.tables[1]
        self.assertEqual(table2.headers, ['Setting', 'Value', 'Description'])
        self.assertEqual(len(table2.rows), 2)
        self.assertIn('Configuration Settings', table2.caption or table2.preceding_text)
    
    def test_code_snippet_extraction(self):
        """Test extraction of code snippets with metadata"""
        content = """
# Code Examples

Here's how to connect to the database:

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    database="mydb",
    user="user",
    password="pass"
)
```

And here's an example of error handling:

```python
try:
    result = risky_operation()
except Exception as e:
    logger.error(f"Operation failed: {e}")
```

You can also use SQL directly:

```sql
SELECT * FROM users WHERE active = true;
```
"""
        
        file_path = self.create_test_file('code_examples.md', content)
        classification = self.classifier.classify_document(file_path)
        result = self.processor.process_document(file_path, classification, content)
        
        # Check code snippets
        self.assertEqual(len(result.code_snippets), 3)
        
        # Check languages detected
        languages = [s.language for s in result.code_snippets]
        self.assertIn('python', languages)
        self.assertIn('sql', languages)
        
        # Check first snippet
        snippet1 = result.code_snippets[0]
        self.assertEqual(snippet1.language, 'python')
        self.assertIn('psycopg2', snippet1.code)
        self.assertIn('database', snippet1.description or '')
    
    def test_reference_extraction(self):
        """Test extraction of various reference types"""
        content = """
# Document with References

See the [installation guide](#installation) for setup instructions.

For more information, visit https://example.com/docs

You can also check [external documentation](https://docs.example.com/api)

According to [Smith 2023], this approach is effective.

Internal link to [configuration section](#config)
"""
        
        file_path = self.create_test_file('references.md', content)
        classification = self.classifier.classify_document(file_path)
        result = self.processor.process_document(file_path, classification, content)
        
        # Check references
        self.assertGreater(len(result.references), 3)
        
        # Check for internal and external references
        internal_refs = [r for r in result.references if r.ref_type == 'internal']
        external_refs = [r for r in result.references if r.ref_type == 'external']
        
        self.assertGreater(len(internal_refs), 0)
        self.assertGreater(len(external_refs), 0)
        
        # Check specific references
        self.assertTrue(any('#installation' in r.target for r in internal_refs))
        self.assertTrue(any('example.com' in r.target for r in external_refs))
    
    def test_metadata_extraction(self):
        """Test extraction of document metadata"""
        content = """
# nscale Documentation

Version: 3.2.1
Date: 2024-01-15
Author: Max Mustermann, Anna Schmidt
Keywords: DMS, Document Management, Enterprise

## Introduction

This is the official documentation...
"""
        
        file_path = self.create_test_file('metadata_doc.md', content)
        classification = self.classifier.classify_document(file_path)
        result = self.processor.process_document(file_path, classification, content)
        
        # Check metadata
        self.assertEqual(result.metadata.title, 'nscale Documentation')
        self.assertEqual(result.metadata.version, '3.2.1')
        self.assertEqual(len(result.metadata.authors), 2)
        self.assertIn('Max Mustermann', result.metadata.authors)
        self.assertIn('Anna Schmidt', result.metadata.authors)
        self.assertGreater(len(result.metadata.keywords), 0)
    
    def test_qa_extraction(self):
        """Test extraction of Q&A pairs"""
        content = """
# Frequently Asked Questions

Q: How do I install nscale?
A: You can install nscale by downloading the installer from our website and following the setup wizard.

Question: What are the system requirements?
Answer: nscale requires Windows 10 or later, 8GB RAM, and 100GB free disk space.

**Can I use nscale on Linux?**
Yes, nscale supports Linux distributions including Ubuntu, Debian, and Red Hat.

**How do I create a new document?**
Click on "New Document" in the toolbar and select the document type you want to create.
"""
        
        file_path = self.create_test_file('faq.md', content)
        classification = self.classifier.classify_document(file_path)
        result = self.processor.process_document(file_path, classification, content)
        
        # Check structured content for Q&A pairs
        self.assertIn('qa_pairs', result.structured_content)
        qa_pairs = result.structured_content['qa_pairs']
        self.assertGreater(len(qa_pairs), 2)
        
        # Check first Q&A pair
        self.assertTrue(any('install' in q['question'].lower() for q in qa_pairs))
        self.assertTrue(any('system requirements' in q['question'].lower() for q in qa_pairs))
    
    def test_hierarchical_structure_extraction(self):
        """Test extraction of hierarchical document structure"""
        content = """
# Main Title

## Section 1
Content for section 1

### Subsection 1.1
Details for subsection 1.1

### Subsection 1.2
Details for subsection 1.2

## Section 2
Content for section 2

### Subsection 2.1
Details for subsection 2.1

#### Subsubsection 2.1.1
Very detailed content
"""
        
        file_path = self.create_test_file('hierarchical.md', content)
        classification = self.classifier.classify_document(file_path)
        result = self.processor.process_document(file_path, classification, content)
        
        # Check sections
        self.assertIn('sections', result.structured_content)
        sections = result.structured_content['sections']
        self.assertGreater(len(sections), 5)
        
        # Check hierarchy
        self.assertIn('hierarchy', result.structured_content)
        hierarchy = result.structured_content['hierarchy']
        self.assertEqual(hierarchy['title'], 'Document')
        self.assertGreater(len(hierarchy['children']), 0)
    
    def test_key_points_extraction(self):
        """Test extraction of key points from lists"""
        content = """
# Important Information

Key features of nscale:

- Digital document management with version control
- Automated workflow processing
- Comprehensive access control and permissions
- Integration with Microsoft Office and other tools
- Full-text search across all documents
- Audit trail and compliance features

Installation steps:

1. Download the installer from the website
2. Run the setup wizard
3. Configure database connection
4. Set up user accounts
5. Import existing documents
"""
        
        file_path = self.create_test_file('key_points.md', content)
        classification = self.classifier.classify_document(file_path)
        result = self.processor.process_document(file_path, classification, content)
        
        # Check key points
        key_points = result.structured_content['key_points']
        self.assertGreater(len(key_points), 5)
        
        # Check content
        self.assertTrue(any('version control' in p for p in key_points))
        self.assertTrue(any('setup wizard' in p for p in key_points))
    
    def test_statistics_calculation(self):
        """Test document statistics calculation"""
        content = """
# Test Document

This is a paragraph with multiple sentences. It contains various elements. We need to test statistics.

## Code Section

```python
def hello():
    print("Hello, World!")
```

## List Section

- Item 1
- Item 2
- Item 3

## Links

See [internal link](#section) and https://example.com
"""
        
        file_path = self.create_test_file('stats_test.md', content)
        classification = self.classifier.classify_document(file_path)
        result = self.processor.process_document(file_path, classification, content)
        
        # Check statistics
        stats = result.statistics
        self.assertIn('text', stats)
        self.assertIn('structure', stats)
        self.assertIn('code', stats)
        self.assertIn('references', stats)
        
        # Check specific values
        self.assertGreater(stats['text']['words'], 20)
        self.assertGreater(stats['text']['sentences'], 3)
        self.assertEqual(stats['structure']['headings'], 4)
        self.assertEqual(stats['structure']['lists'], 3)
        self.assertEqual(stats['code']['total_snippets'], 1)
        self.assertGreater(stats['references']['total'], 1)
    
    def test_processing_warnings(self):
        """Test generation of processing warnings"""
        # Create a very large document
        content = "# Large Document\n\n"
        content += "This is a test paragraph. " * 1000  # Create large content
        
        file_path = self.create_test_file('large_doc.md', content)
        classification = self.classifier.classify_document(file_path)
        result = self.processor.process_document(file_path, classification, content)
        
        # Should have warning about large document
        self.assertGreater(len(result.warnings), 0)
        self.assertTrue(any('large' in w.lower() for w in result.warnings))
    
    def test_code_aware_processing(self):
        """Test code-aware processing strategy"""
        content = """
# API Documentation

## Authentication

Use the following code to authenticate:

```python
from api_client import Client

client = Client(api_key="your_key")
client.authenticate()
```

## Making Requests

Example GET request:

```python
response = client.get("/users")
users = response.json()
```

Example POST request:

```python
data = {"name": "John", "email": "john@example.com"}
response = client.post("/users", json=data)
```

## Error Handling

```python
try:
    response = client.get("/protected")
except AuthError:
    client.refresh_token()
except APIError as e:
    logger.error(f"API error: {e}")
```
"""
        
        file_path = self.create_test_file('api_doc.md', content)
        classification = self.classifier.classify_document(file_path)
        
        # Ensure code-aware strategy is used
        self.assertEqual(classification.processing_strategy, ProcessingStrategy.CODE_AWARE)
        
        result = self.processor.process_document(file_path, classification, content)
        
        # Check code examples extracted
        self.assertIn('examples', result.structured_content)
        examples = result.structured_content['examples']
        self.assertGreater(len(examples), 2)
        
        # Check code snippets
        self.assertGreater(len(result.code_snippets), 3)
        
        # All should be Python
        for snippet in result.code_snippets:
            self.assertEqual(snippet.language, 'python')
    
    def test_table_optimized_processing(self):
        """Test table-optimized processing for data-heavy documents"""
        content = """
# Sales Report

## Q1 Results

| Month | Revenue | Growth | Target |
|-------|---------|--------|--------|
| Jan   | $100K   | +5%    | $95K   |
| Feb   | $110K   | +10%   | $100K  |
| Mar   | $125K   | +13%   | $110K  |

## Q2 Projections

| Month | Expected | Min | Max |
|-------|----------|-----|-----|
| Apr   | $130K    | $120K | $140K |
| May   | $135K    | $125K | $145K |
| Jun   | $140K    | $130K | $150K |

## Product Performance

| Product | Units Sold | Revenue | Margin |
|---------|------------|---------|--------|
| A       | 1,000      | $50K    | 40%    |
| B       | 750        | $40K    | 35%    |
| C       | 500        | $35K    | 45%    |
"""
        
        file_path = self.create_test_file('sales_data.md', content)
        classification = self.classifier.classify_document(file_path)
        result = self.processor.process_document(file_path, classification, content)
        
        # Should extract all tables
        self.assertEqual(len(result.tables), 3)
        
        # Check table metadata preserved
        for table in result.tables:
            self.assertIsNotNone(table.caption or table.preceding_text)
            self.assertGreater(len(table.headers), 0)
            self.assertGreater(len(table.rows), 0)


class TestFormattingPreservation(unittest.TestCase):
    """Test preservation of formatting context"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.processor = EnhancedProcessor()
    
    def test_formatting_context_preservation(self):
        """Test that formatting context is preserved"""
        content = """
# **Important** Document

This document contains _various_ formatting elements.

## Lists and Structure

1. **Bold item**
2. _Italic item_
3. `Code item`

> This is a blockquote
> with multiple lines

---

### Code Examples

```
Plain code block
```

**Note:** This is important!
"""
        
        formatting = self.processor.preserve_formatting_context(content)
        
        # Check formatting detection
        self.assertTrue(formatting['has_headers'])
        self.assertTrue(formatting['has_lists'])
        self.assertTrue(formatting['has_numbered_lists'])
        self.assertTrue(formatting['has_blockquotes'])
        self.assertTrue(formatting['has_horizontal_rules'])
        
        # Check emphasis markers
        self.assertGreater(formatting['emphasis_markers']['bold'], 2)
        self.assertGreater(formatting['emphasis_markers']['italic'], 1)
        self.assertGreater(formatting['emphasis_markers']['code'], 0)


class TestBatchProcessing(unittest.TestCase):
    """Test batch processing capabilities"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.processor = EnhancedProcessor()
        self.classifier = DocumentClassifier()
        self.test_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        import shutil
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_batch_document_processing(self):
        """Test processing multiple documents"""
        documents = [
            ("doc1.md", "# Document 1\n\nContent with [link](https://example.com)"),
            ("doc2.md", "# Document 2\n\n```python\ncode = 'example'\n```"),
            ("doc3.md", "# Document 3\n\n| Col1 | Col2 |\n|------|------|\n| A    | B    |"),
        ]
        
        results = []
        for filename, content in documents:
            file_path = os.path.join(self.test_dir, filename)
            with open(file_path, 'w') as f:
                f.write(content)
            
            classification = self.classifier.classify_document(file_path)
            result = self.processor.process_document(file_path, classification, content)
            results.append(result)
        
        # Check all processed
        self.assertEqual(len(results), 3)
        
        # Check each has expected content
        self.assertGreater(len(results[0].references), 0)  # Has link
        self.assertGreater(len(results[1].code_snippets), 0)  # Has code
        self.assertGreater(len(results[2].tables), 0)  # Has table


if __name__ == '__main__':
    unittest.main(verbosity=2)