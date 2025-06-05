"""
Enhanced Document Classifier for Automated RAG Processing
Provides intelligent document type detection, content analysis, and processing strategy determination
"""

import os
import mimetypes
import hashlib
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
import re

# External dependencies
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    
try:
    from langdetect import detect, detect_langs
    LANGDETECT_AVAILABLE = True
except ImportError:
    LANGDETECT_AVAILABLE = False

from ..core.logging import LogManager
import logging


class DocumentType(Enum):
    """Supported document types for processing"""
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    HTML = "html"
    MARKDOWN = "markdown"
    XLSX = "xlsx"
    PPTX = "pptx"
    RTF = "rtf"
    CSV = "csv"
    XML = "xml"
    JSON = "json"
    UNKNOWN = "unknown"


class ContentCategory(Enum):
    """Content categories for documents"""
    MANUAL = "manual"
    FAQ = "faq"
    TUTORIAL = "tutorial"
    CONFIGURATION = "configuration"
    API_DOCUMENTATION = "api_documentation"
    TROUBLESHOOTING = "troubleshooting"
    RELEASE_NOTES = "release_notes"
    TECHNICAL_SPEC = "technical_specification"
    USER_GUIDE = "user_guide"
    ADMIN_GUIDE = "admin_guide"
    GENERAL = "general"


class StructureType(Enum):
    """Document structure types"""
    HIERARCHICAL = "hierarchical"
    TABULAR = "tabular"
    UNSTRUCTURED = "unstructured"
    MIXED = "mixed"
    LIST_BASED = "list_based"
    QA_FORMAT = "qa_format"


class ProcessingStrategy(Enum):
    """Processing strategies for different document types"""
    STANDARD = "standard"
    TABLE_OPTIMIZED = "table_optimized"
    CODE_AWARE = "code_aware"
    HIERARCHICAL_PRESERVE = "hierarchical_preserve"
    QA_EXTRACTION = "qa_extraction"
    MINIMAL = "minimal"
    DEEP_ANALYSIS = "deep_analysis"


@dataclass
class DocumentMetadata:
    """Comprehensive document metadata"""
    filename: str
    file_path: str
    file_size: int
    document_type: DocumentType
    mime_type: str
    content_category: ContentCategory
    structure_type: StructureType
    language: str
    encoding: str
    created_at: datetime
    modified_at: datetime
    file_hash: str
    confidence_scores: Dict[str, float] = field(default_factory=dict)
    extracted_metadata: Dict[str, Any] = field(default_factory=dict)
    processing_hints: List[str] = field(default_factory=list)
    quality_indicators: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ClassificationResult:
    """Result of document classification"""
    metadata: DocumentMetadata
    processing_strategy: ProcessingStrategy
    priority_score: float
    estimated_processing_time: float
    warnings: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


class DocumentClassifier:
    """
    Enhanced document classifier for automated RAG processing
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize the document classifier with configuration"""
        self.config = config or {}
        self.logger = LogManager.setup_logging(__name__)
        
        # Initialize mime types
        mimetypes.init()
        
        # Content patterns for category detection
        self.content_patterns = {
            ContentCategory.MANUAL: [
                r'handbuch', r'manual', r'bedienungsanleitung', r'user\s+guide',
                r'benutzerhandbuch', r'anleitung', r'guide'
            ],
            ContentCategory.FAQ: [
                r'faq', r'frequently\s+asked', r'häufig\s+gestellte\s+fragen',
                r'q\s*&\s*a', r'questions?\s+and\s+answers?'
            ],
            ContentCategory.TUTORIAL: [
                r'tutorial', r'how\s*to', r'getting\s+started', r'quick\s+start',
                r'einführung', r'erste\s+schritte', r'leitfaden'
            ],
            ContentCategory.CONFIGURATION: [
                r'config', r'konfiguration', r'settings', r'einstellungen',
                r'setup', r'installation', r'deployment'
            ],
            ContentCategory.API_DOCUMENTATION: [
                r'api', r'endpoint', r'rest', r'graphql', r'swagger',
                r'openapi', r'reference', r'schnittstelle'
            ],
            ContentCategory.TROUBLESHOOTING: [
                r'troubleshoot', r'fehler', r'problem', r'lösung',
                r'error', r'issue', r'debug', r'diagnose'
            ],
            ContentCategory.RELEASE_NOTES: [
                r'release\s+notes?', r'changelog', r'version', r'update',
                r'änderungen', r'neuigkeiten', r'patch'
            ],
            ContentCategory.TECHNICAL_SPEC: [
                r'specification', r'spezifikation', r'technical', r'technisch',
                r'architecture', r'architektur', r'design'
            ],
            ContentCategory.USER_GUIDE: [
                r'user', r'benutzer', r'enduser', r'end-user',
                r'anwender', r'nutzer'
            ],
            ContentCategory.ADMIN_GUIDE: [
                r'admin', r'administrator', r'verwaltung', r'management',
                r'system', r'maintenance', r'wartung'
            ]
        }
        
        # Compile regex patterns for efficiency
        self.compiled_patterns = {}
        for category, patterns in self.content_patterns.items():
            self.compiled_patterns[category] = [
                re.compile(pattern, re.IGNORECASE) for pattern in patterns
            ]
        
        # File extension to document type mapping
        self.extension_mapping = {
            '.pdf': DocumentType.PDF,
            '.docx': DocumentType.DOCX,
            '.doc': DocumentType.DOCX,
            '.txt': DocumentType.TXT,
            '.html': DocumentType.HTML,
            '.htm': DocumentType.HTML,
            '.md': DocumentType.MARKDOWN,
            '.markdown': DocumentType.MARKDOWN,
            '.xlsx': DocumentType.XLSX,
            '.xls': DocumentType.XLSX,
            '.pptx': DocumentType.PPTX,
            '.ppt': DocumentType.PPTX,
            '.rtf': DocumentType.RTF,
            '.csv': DocumentType.CSV,
            '.xml': DocumentType.XML,
            '.json': DocumentType.JSON
        }
        
        # Processing strategy rules
        self.strategy_rules = {
            (DocumentType.XLSX, StructureType.TABULAR): ProcessingStrategy.TABLE_OPTIMIZED,
            (DocumentType.CSV, StructureType.TABULAR): ProcessingStrategy.TABLE_OPTIMIZED,
            (DocumentType.MARKDOWN, StructureType.HIERARCHICAL): ProcessingStrategy.HIERARCHICAL_PRESERVE,
            (DocumentType.HTML, StructureType.HIERARCHICAL): ProcessingStrategy.HIERARCHICAL_PRESERVE,
            (ContentCategory.FAQ, StructureType.QA_FORMAT): ProcessingStrategy.QA_EXTRACTION,
            (ContentCategory.API_DOCUMENTATION, StructureType.MIXED): ProcessingStrategy.CODE_AWARE,
            (ContentCategory.TECHNICAL_SPEC, StructureType.MIXED): ProcessingStrategy.DEEP_ANALYSIS,
        }
        
        self.logger.info("🤖 DocumentClassifier initialized with enhanced capabilities")
    
    def classify_document(self, file_path: str) -> ClassificationResult:
        """
        Classify a document and determine optimal processing strategy
        
        Args:
            file_path: Path to the document file
            
        Returns:
            ClassificationResult with metadata and processing strategy
        """
        start_time = datetime.now()
        self.logger.info(f"📊 Starting classification for: {file_path}")
        
        try:
            # Validate file exists
            path = Path(file_path)
            if not path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Extract basic metadata
            metadata = self._extract_basic_metadata(path)
            
            # Detect document type
            metadata.document_type = self._detect_document_type(path)
            
            # Analyze content (if possible)
            if metadata.document_type != DocumentType.UNKNOWN:
                self._analyze_content(path, metadata)
            
            # Detect language
            if LANGDETECT_AVAILABLE:
                metadata.language = self._detect_language(path, metadata.document_type)
            else:
                metadata.language = "de"  # Default to German
                metadata.processing_hints.append("Language detection unavailable - defaulting to German")
            
            # Analyze structure
            metadata.structure_type = self._analyze_structure(path, metadata)
            
            # Determine processing strategy
            strategy = self._determine_processing_strategy(metadata)
            
            # Calculate priority and processing time
            priority = self._calculate_priority(metadata)
            processing_time = self._estimate_processing_time(metadata)
            
            # Generate recommendations
            warnings, recommendations = self._generate_recommendations(metadata)
            
            # Create result
            result = ClassificationResult(
                metadata=metadata,
                processing_strategy=strategy,
                priority_score=priority,
                estimated_processing_time=processing_time,
                warnings=warnings,
                recommendations=recommendations
            )
            
            elapsed = (datetime.now() - start_time).total_seconds()
            self.logger.info(f"✅ Classification completed in {elapsed:.2f}s")
            self.logger.info(f"📋 Type: {metadata.document_type.value}, "
                           f"Category: {metadata.content_category.value}, "
                           f"Strategy: {strategy.value}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"❌ Classification failed: {str(e)}")
            raise
    
    def extract_metadata(self, file_path: str) -> DocumentMetadata:
        """
        Extract comprehensive metadata from a document
        
        Args:
            file_path: Path to the document
            
        Returns:
            DocumentMetadata object
        """
        result = self.classify_document(file_path)
        return result.metadata
    
    def determine_processing_strategy(self, doc_type: DocumentType, 
                                    content_category: ContentCategory,
                                    structure_type: StructureType) -> ProcessingStrategy:
        """
        Determine optimal processing strategy based on document characteristics
        
        Args:
            doc_type: Document type
            content_category: Content category
            structure_type: Structure type
            
        Returns:
            Recommended ProcessingStrategy
        """
        # Check specific rules first
        key1 = (doc_type, structure_type)
        if key1 in self.strategy_rules:
            return self.strategy_rules[key1]
        
        key2 = (content_category, structure_type)
        if key2 in self.strategy_rules:
            return self.strategy_rules[key2]
        
        # Default strategies based on document type
        if doc_type in [DocumentType.XLSX, DocumentType.CSV]:
            return ProcessingStrategy.TABLE_OPTIMIZED
        elif structure_type == StructureType.HIERARCHICAL:
            return ProcessingStrategy.HIERARCHICAL_PRESERVE
        elif content_category == ContentCategory.FAQ:
            return ProcessingStrategy.QA_EXTRACTION
        elif content_category in [ContentCategory.API_DOCUMENTATION, ContentCategory.TECHNICAL_SPEC]:
            return ProcessingStrategy.CODE_AWARE
        
        return ProcessingStrategy.STANDARD
    
    def _extract_basic_metadata(self, path: Path) -> DocumentMetadata:
        """Extract basic file metadata"""
        stat = path.stat()
        
        # Calculate file hash
        file_hash = self._calculate_file_hash(path)
        
        # Get MIME type
        mime_type, encoding = mimetypes.guess_type(str(path))
        if not mime_type and MAGIC_AVAILABLE:
            mime = magic.Magic(mime=True)
            mime_type = mime.from_file(str(path))
        
        return DocumentMetadata(
            filename=path.name,
            file_path=str(path),
            file_size=stat.st_size,
            document_type=DocumentType.UNKNOWN,  # Will be updated
            mime_type=mime_type or "application/octet-stream",
            content_category=ContentCategory.GENERAL,  # Will be updated
            structure_type=StructureType.UNSTRUCTURED,  # Will be updated
            language="unknown",  # Will be updated
            encoding=encoding or "utf-8",
            created_at=datetime.fromtimestamp(stat.st_ctime),
            modified_at=datetime.fromtimestamp(stat.st_mtime),
            file_hash=file_hash
        )
    
    def _detect_document_type(self, path: Path) -> DocumentType:
        """Detect document type from extension and content"""
        # First try by extension
        ext = path.suffix.lower()
        if ext in self.extension_mapping:
            return self.extension_mapping[ext]
        
        # Try magic bytes if available
        if MAGIC_AVAILABLE:
            mime = magic.Magic(mime=True)
            mime_type = mime.from_file(str(path))
            
            if 'pdf' in mime_type:
                return DocumentType.PDF
            elif 'officedocument.wordprocessingml' in mime_type:
                return DocumentType.DOCX
            elif 'officedocument.spreadsheetml' in mime_type:
                return DocumentType.XLSX
            elif 'officedocument.presentationml' in mime_type:
                return DocumentType.PPTX
            elif 'html' in mime_type:
                return DocumentType.HTML
            elif 'text/plain' in mime_type:
                return DocumentType.TXT
            elif 'json' in mime_type:
                return DocumentType.JSON
            elif 'xml' in mime_type:
                return DocumentType.XML
        
        return DocumentType.UNKNOWN
    
    def _analyze_content(self, path: Path, metadata: DocumentMetadata) -> None:
        """Analyze document content to determine category"""
        try:
            # Get sample content for analysis
            content = self._get_sample_content(path, metadata.document_type)
            if not content:
                return
            
            # Normalize content for analysis
            content_lower = content.lower()
            filename_lower = metadata.filename.lower()
            
            # Score each category
            category_scores = {}
            for category, patterns in self.compiled_patterns.items():
                score = 0.0
                for pattern in patterns:
                    # Check in filename (higher weight)
                    if pattern.search(filename_lower):
                        score += 2.0
                    # Check in content
                    matches = pattern.findall(content_lower)
                    score += len(matches) * 0.5
                
                if score > 0:
                    category_scores[category] = score
            
            # Select category with highest score
            if category_scores:
                best_category = max(category_scores.items(), key=lambda x: x[1])
                metadata.content_category = best_category[0]
                metadata.confidence_scores['content_category'] = min(best_category[1] / 10, 1.0)
            
            # Extract additional metadata
            self._extract_content_metadata(content, metadata)
            
        except Exception as e:
            self.logger.warning(f"⚠️ Content analysis failed: {str(e)}")
            metadata.processing_hints.append(f"Content analysis failed: {str(e)}")
    
    def _get_sample_content(self, path: Path, doc_type: DocumentType, 
                           max_size: int = 10000) -> Optional[str]:
        """Get sample content from document for analysis"""
        try:
            if doc_type in [DocumentType.TXT, DocumentType.MARKDOWN]:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read(max_size)
            elif doc_type == DocumentType.HTML:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read(max_size)
                    # Simple HTML tag removal
                    return re.sub(r'<[^>]+>', ' ', content)
            elif doc_type == DocumentType.JSON:
                with open(path, 'r', encoding='utf-8') as f:
                    import json
                    data = json.load(f)
                    return json.dumps(data, ensure_ascii=False)[:max_size]
            # For other types, we'd need specialized libraries
            return None
        except Exception:
            return None
    
    def _detect_language(self, path: Path, doc_type: DocumentType) -> str:
        """Detect document language"""
        try:
            content = self._get_sample_content(path, doc_type, max_size=5000)
            if content and len(content) > 50:
                # Get language probabilities
                langs = detect_langs(content)
                if langs:
                    # Return most likely language
                    return langs[0].lang
        except Exception as e:
            self.logger.debug(f"Language detection failed: {str(e)}")
        
        return "de"  # Default to German for nscale documentation
    
    def _analyze_structure(self, path: Path, metadata: DocumentMetadata) -> StructureType:
        """Analyze document structure"""
        # Spreadsheets are inherently tabular
        if metadata.document_type in [DocumentType.XLSX, DocumentType.CSV]:
            return StructureType.TABULAR
        
        # Analyze content-based structure
        content = self._get_sample_content(path, metadata.document_type)
        if not content:
            return StructureType.UNSTRUCTURED
        
        # Check for hierarchical markers
        heading_patterns = [
            r'^#{1,6}\s+',  # Markdown headings
            r'^=+\s*$',     # Underline style headings
            r'^\d+\.\d+',   # Numbered sections
            r'^Chapter\s+\d+',
            r'^Kapitel\s+\d+',
        ]
        
        hierarchical_score = 0
        for pattern in heading_patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            hierarchical_score += len(matches)
        
        # Check for Q&A patterns
        qa_patterns = [
            r'^(Q:|Question:|Frage:)',
            r'^(A:|Answer:|Antwort:)',
            r'\?[\s\n]+(Answer|Antwort|A:)',
        ]
        
        qa_score = 0
        for pattern in qa_patterns:
            matches = re.findall(pattern, content, re.MULTILINE | re.IGNORECASE)
            qa_score += len(matches)
        
        # Check for lists
        list_patterns = [
            r'^\s*[-*•]\s+',
            r'^\s*\d+\.\s+',
            r'^\s*[a-z]\)\s+',
        ]
        
        list_score = 0
        for pattern in list_patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            list_score += len(matches)
        
        # Determine structure type
        if hierarchical_score > 5:
            return StructureType.HIERARCHICAL
        elif qa_score > 3:
            return StructureType.QA_FORMAT
        elif list_score > 10:
            return StructureType.LIST_BASED
        elif hierarchical_score > 0 or qa_score > 0:
            return StructureType.MIXED
        
        return StructureType.UNSTRUCTURED
    
    def _extract_content_metadata(self, content: str, metadata: DocumentMetadata) -> None:
        """Extract additional metadata from content"""
        # Extract version information
        version_pattern = r'(?:version|Version|v)\s*[:=]?\s*([\d.]+)'
        version_match = re.search(version_pattern, content)
        if version_match:
            metadata.extracted_metadata['version'] = version_match.group(1)
        
        # Extract date information
        date_patterns = [
            r'(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
            r'(\d{4}-\d{2}-\d{2})',
            r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
            r'(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{1,2},?\s+\d{4}',
        ]
        
        for pattern in date_patterns:
            date_match = re.search(pattern, content, re.IGNORECASE)
            if date_match:
                metadata.extracted_metadata['document_date'] = date_match.group(0)
                break
        
        # Count code blocks
        code_blocks = len(re.findall(r'```[\s\S]*?```', content))
        if code_blocks > 0:
            metadata.extracted_metadata['code_blocks'] = code_blocks
            metadata.processing_hints.append(f"Contains {code_blocks} code blocks")
        
        # Count tables (simple detection)
        table_indicators = len(re.findall(r'\|.*\|.*\|', content))
        if table_indicators > 3:
            metadata.extracted_metadata['has_tables'] = True
            metadata.processing_hints.append("Contains table structures")
    
    def _determine_processing_strategy(self, metadata: DocumentMetadata) -> ProcessingStrategy:
        """Determine optimal processing strategy"""
        strategy = self.determine_processing_strategy(
            metadata.document_type,
            metadata.content_category,
            metadata.structure_type
        )
        
        # Additional rules based on metadata
        if metadata.extracted_metadata.get('code_blocks', 0) > 5:
            strategy = ProcessingStrategy.CODE_AWARE
        elif metadata.extracted_metadata.get('has_tables', False):
            if strategy == ProcessingStrategy.STANDARD:
                strategy = ProcessingStrategy.TABLE_OPTIMIZED
        
        return strategy
    
    def _calculate_priority(self, metadata: DocumentMetadata) -> float:
        """Calculate processing priority (0-1, higher is more important)"""
        priority = 0.5  # Base priority
        
        # Content category weights
        category_weights = {
            ContentCategory.USER_GUIDE: 0.9,
            ContentCategory.FAQ: 0.85,
            ContentCategory.MANUAL: 0.85,
            ContentCategory.TUTORIAL: 0.8,
            ContentCategory.TROUBLESHOOTING: 0.75,
            ContentCategory.API_DOCUMENTATION: 0.7,
            ContentCategory.ADMIN_GUIDE: 0.65,
            ContentCategory.CONFIGURATION: 0.6,
            ContentCategory.TECHNICAL_SPEC: 0.55,
            ContentCategory.RELEASE_NOTES: 0.5,
            ContentCategory.GENERAL: 0.4
        }
        
        priority = category_weights.get(metadata.content_category, 0.5)
        
        # Adjust based on file size (prefer smaller files for quick wins)
        if metadata.file_size < 100_000:  # < 100KB
            priority += 0.1
        elif metadata.file_size > 10_000_000:  # > 10MB
            priority -= 0.1
        
        # Adjust based on structure (well-structured documents are easier)
        if metadata.structure_type in [StructureType.HIERARCHICAL, StructureType.QA_FORMAT]:
            priority += 0.05
        
        # Ensure priority is between 0 and 1
        return max(0.0, min(1.0, priority))
    
    def _estimate_processing_time(self, metadata: DocumentMetadata) -> float:
        """Estimate processing time in seconds"""
        # Base time based on file size (rough estimate: 1MB = 10 seconds)
        base_time = (metadata.file_size / 1_000_000) * 10
        
        # Multipliers based on document type
        type_multipliers = {
            DocumentType.PDF: 1.5,
            DocumentType.DOCX: 1.2,
            DocumentType.XLSX: 2.0,
            DocumentType.PPTX: 1.8,
            DocumentType.HTML: 0.8,
            DocumentType.TXT: 0.5,
            DocumentType.MARKDOWN: 0.6,
            DocumentType.RTF: 1.3,
            DocumentType.CSV: 0.7,
            DocumentType.JSON: 0.6,
            DocumentType.XML: 0.9,
            DocumentType.UNKNOWN: 2.0
        }
        
        time_estimate = base_time * type_multipliers.get(metadata.document_type, 1.0)
        
        # Adjust based on processing strategy
        strategy_multipliers = {
            ProcessingStrategy.MINIMAL: 0.5,
            ProcessingStrategy.STANDARD: 1.0,
            ProcessingStrategy.TABLE_OPTIMIZED: 1.5,
            ProcessingStrategy.CODE_AWARE: 1.3,
            ProcessingStrategy.HIERARCHICAL_PRESERVE: 1.1,
            ProcessingStrategy.QA_EXTRACTION: 1.2,
            ProcessingStrategy.DEEP_ANALYSIS: 2.0
        }
        
        # We don't have the strategy here, so use a default
        time_estimate *= 1.0
        
        # Minimum 1 second, maximum 5 minutes
        return max(1.0, min(300.0, time_estimate))
    
    def _generate_recommendations(self, metadata: DocumentMetadata) -> Tuple[List[str], List[str]]:
        """Generate warnings and recommendations"""
        warnings = []
        recommendations = []
        
        # File size warnings
        if metadata.file_size > 50_000_000:  # > 50MB
            warnings.append("Large file size may result in longer processing time")
            recommendations.append("Consider splitting the document into smaller sections")
        
        # Document type warnings
        if metadata.document_type == DocumentType.UNKNOWN:
            warnings.append("Unknown document type - processing may be limited")
            recommendations.append("Convert to a supported format (PDF, DOCX, TXT, etc.)")
        
        # Language warnings
        if metadata.language not in ['de', 'en']:
            warnings.append(f"Document language '{metadata.language}' may not be fully supported")
            recommendations.append("Best results with German (de) or English (en) documents")
        
        # Structure recommendations
        if metadata.structure_type == StructureType.UNSTRUCTURED:
            recommendations.append("Add section headings to improve content organization")
        
        # Content-specific recommendations
        if metadata.content_category == ContentCategory.FAQ:
            recommendations.append("Ensure Q&A pairs are clearly formatted for optimal extraction")
        elif metadata.content_category == ContentCategory.API_DOCUMENTATION:
            recommendations.append("Include code examples in proper code blocks for better parsing")
        
        # Quality indicators
        if metadata.confidence_scores.get('content_category', 1.0) < 0.5:
            warnings.append("Low confidence in content categorization")
            recommendations.append("Add descriptive filename or document title")
        
        return warnings, recommendations
    
    def _calculate_file_hash(self, path: Path) -> str:
        """Calculate SHA-256 hash of file"""
        sha256_hash = hashlib.sha256()
        with open(path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()


def batch_classify_documents(file_paths: List[str], 
                           config: Optional[Dict[str, Any]] = None) -> List[ClassificationResult]:
    """
    Classify multiple documents in batch
    
    Args:
        file_paths: List of file paths to classify
        config: Optional configuration
        
    Returns:
        List of ClassificationResults
    """
    classifier = DocumentClassifier(config)
    results = []
    
    for file_path in file_paths:
        try:
            result = classifier.classify_document(file_path)
            results.append(result)
        except Exception as e:
            classifier.logger.error(f"Failed to classify {file_path}: {str(e)}")
            # Create a minimal result with error info
            metadata = DocumentMetadata(
                filename=Path(file_path).name,
                file_path=file_path,
                file_size=0,
                document_type=DocumentType.UNKNOWN,
                mime_type="unknown",
                content_category=ContentCategory.GENERAL,
                structure_type=StructureType.UNSTRUCTURED,
                language="unknown",
                encoding="unknown",
                created_at=datetime.now(),
                modified_at=datetime.now(),
                file_hash=""
            )
            result = ClassificationResult(
                metadata=metadata,
                processing_strategy=ProcessingStrategy.MINIMAL,
                priority_score=0.0,
                estimated_processing_time=0.0,
                warnings=[f"Classification failed: {str(e)}"]
            )
            results.append(result)
    
    return results


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        classifier = DocumentClassifier()
        
        try:
            result = classifier.classify_document(file_path)
            
            print(f"\n📄 Document Classification Results")
            print(f"{'='*60}")
            print(f"File: {result.metadata.filename}")
            print(f"Type: {result.metadata.document_type.value}")
            print(f"Category: {result.metadata.content_category.value}")
            print(f"Language: {result.metadata.language}")
            print(f"Structure: {result.metadata.structure_type.value}")
            print(f"Processing Strategy: {result.processing_strategy.value}")
            print(f"Priority Score: {result.priority_score:.2f}")
            print(f"Estimated Time: {result.estimated_processing_time:.1f}s")
            
            if result.warnings:
                print(f"\n⚠️  Warnings:")
                for warning in result.warnings:
                    print(f"  - {warning}")
            
            if result.recommendations:
                print(f"\n💡 Recommendations:")
                for rec in result.recommendations:
                    print(f"  - {rec}")
            
            if result.metadata.extracted_metadata:
                print(f"\n📊 Extracted Metadata:")
                for key, value in result.metadata.extracted_metadata.items():
                    print(f"  - {key}: {value}")
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            sys.exit(1)
    else:
        print("Usage: python document_classifier.py <file_path>")