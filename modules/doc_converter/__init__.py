"""
Document Converter Module for Automated RAG Processing
Part of Phase 2.7: Advanced Document Intelligence & Integration
"""

# Import existing components with error handling
try:
    from .document_classifier import (
        DocumentClassifier,
        DocumentType,
        ContentCategory,
        StructureType,
        ProcessingStrategy,
        DocumentMetadata,
        ClassificationResult,
        batch_classify_documents
    )
    CLASSIFIER_AVAILABLE = True
except ImportError:
    CLASSIFIER_AVAILABLE = False

# Import Phase 2.7 components
from .advanced_document_processor import AdvancedDocumentProcessor
from .ocr_processor import OCRProcessor
from .language_detector import LanguageDetector
from .enhanced_metadata_extractor import EnhancedMetadataExtractor

# Build __all__ list dynamically
__all__ = [
    'AdvancedDocumentProcessor',
    'OCRProcessor',
    'LanguageDetector',
    'EnhancedMetadataExtractor'
]

if CLASSIFIER_AVAILABLE:
    __all__.extend([
        'DocumentClassifier',
        'DocumentType',
        'ContentCategory',
        'StructureType',
        'ProcessingStrategy',
        'DocumentMetadata',
        'ClassificationResult',
        'batch_classify_documents'
    ])