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

# Export routers for server integration
try:
    from .routes import router
    ROUTER_AVAILABLE = True
except ImportError:
    ROUTER_AVAILABLE = False
    router = None

try:
    from .advanced_routes import router as advanced_router
    ADVANCED_ROUTER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import advanced_router: {e}")
    ADVANCED_ROUTER_AVAILABLE = False
    advanced_router = None

if ROUTER_AVAILABLE:
    __all__.append('router')
if ADVANCED_ROUTER_AVAILABLE:
    __all__.append('advanced_router')