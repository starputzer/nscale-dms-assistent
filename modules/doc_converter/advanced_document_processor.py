"""
Advanced Document Processor integrating OCR, language detection, and metadata extraction.
Part of Phase 2.7: Advanced Document Intelligence & Integration
"""

import os
import logging
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import tempfile
import json
from datetime import datetime

from .ocr_processor import OCRProcessor
from .language_detector import LanguageDetector
from .enhanced_metadata_extractor import EnhancedMetadataExtractor

logger = logging.getLogger(__name__)

# Import existing processors - make imports conditional
try:
    from doc_converter.processing.enhanced_processor import EnhancedDocumentProcessor
    ENHANCED_PROCESSOR_AVAILABLE = True
except ImportError:
    ENHANCED_PROCESSOR_AVAILABLE = False
    EnhancedDocumentProcessor = None
    # Only log warning if we're in debug mode
    if os.getenv('DEBUG', '').lower() == 'true':
        logger.warning("Enhanced document processor not available")

try:
    from modules.rag.integrated_document_processor import IntegratedDocumentProcessor as RagIntegratedDocumentProcessor
    INTEGRATED_PROCESSOR_AVAILABLE = True
except ImportError:
    INTEGRATED_PROCESSOR_AVAILABLE = False
    RagIntegratedDocumentProcessor = None
    # Only log warning if we're in debug mode
    if os.getenv('DEBUG', '').lower() == 'true':
        logger.warning("Integrated document processor not available")


class AdvancedDocumentProcessor:
    """
    Advanced document processor that integrates all Phase 2.7 capabilities.
    Coordinates OCR, language detection, metadata extraction, and existing processing.
    """
    
    def __init__(self, 
                 rag_engine=None,
                 knowledge_manager=None,
                 enable_ocr: bool = True,
                 enable_language_detection: bool = True,
                 enable_metadata_extraction: bool = True,
                 ocr_languages: str = 'deu+eng',
                 ocr_confidence_threshold: float = 0.7):
        """
        Initialize advanced document processor.
        
        Args:
            rag_engine: RAG engine instance
            knowledge_manager: Knowledge manager instance
            enable_ocr: Enable OCR for scanned documents
            enable_language_detection: Enable automatic language detection
            enable_metadata_extraction: Enable enhanced metadata extraction
            ocr_languages: Languages for OCR (tesseract format)
            ocr_confidence_threshold: Minimum OCR confidence threshold
        """
        # Initialize existing processors if available
        self.enhanced_processor = EnhancedDocumentProcessor() if ENHANCED_PROCESSOR_AVAILABLE else None
        self.integrated_processor = IntegratedDocumentProcessor(
            rag_engine=rag_engine,
            knowledge_manager=knowledge_manager
        ) if INTEGRATED_PROCESSOR_AVAILABLE and rag_engine else None
        
        # Initialize Phase 2.7 components
        self.ocr_processor = OCRProcessor(lang=ocr_languages) if enable_ocr else None
        self.language_detector = LanguageDetector() if enable_language_detection else None
        self.metadata_extractor = EnhancedMetadataExtractor() if enable_metadata_extraction else None
        
        self.ocr_confidence_threshold = ocr_confidence_threshold
        
        # Processing statistics
        self.stats = {
            'total_processed': 0,
            'ocr_processed': 0,
            'languages_detected': {},
            'document_types': {},
            'processing_errors': 0
        }
        
    def process_document(self, 
                        file_path: str,
                        doc_type: Optional[str] = None,
                        metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Process document with all advanced capabilities.
        
        Args:
            file_path: Path to document
            doc_type: Document type (auto-detected if not provided)
            metadata: Existing metadata to enhance
            
        Returns:
            Processing result with enhanced metadata and content
        """
        logger.info(f"Processing document with advanced capabilities: {file_path}")
        self.stats['total_processed'] += 1
        
        result = {
            'success': False,
            'file_path': file_path,
            'original_metadata': metadata or {},
            'processing_steps': [],
            'errors': []
        }
        
        try:
            # Step 1: Check if OCR is needed
            ocr_result = None
            if self._should_use_ocr(file_path):
                ocr_result = self._process_with_ocr(file_path)
                result['processing_steps'].append('ocr')
                
                if ocr_result and ocr_result['success']:
                    result['ocr_result'] = {
                        'pages': len(ocr_result['pages']),
                        'confidence': self._calculate_overall_confidence(ocr_result),
                        'text_length': len(ocr_result['text'])
                    }
                    
            # Step 2: Process with existing processors
            if ocr_result and ocr_result['success']:
                # Use OCR text for processing
                content = ocr_result['text']
                processing_result = self._process_content(content, file_path, doc_type)
            else:
                # Normal processing
                processing_result = self._process_file(file_path, doc_type)
                content = processing_result.get('content', '')
                
            result.update(processing_result)
            
            # Step 3: Language detection
            if self.language_detector and content:
                lang_result = self.language_detector.detect_language(content)
                result['language'] = lang_result
                result['processing_steps'].append('language_detection')
                
                # Update statistics
                lang_code = lang_result.get('language', 'unknown')
                self.stats['languages_detected'][lang_code] = \
                    self.stats['languages_detected'].get(lang_code, 0) + 1
                    
            # Step 4: Enhanced metadata extraction
            if self.metadata_extractor and content:
                enhanced_metadata = self.metadata_extractor.extract_metadata(
                    content, 
                    file_path,
                    result.get('metadata', {})
                )
                result['metadata'] = enhanced_metadata
                result['processing_steps'].append('metadata_extraction')
                
                # Update document type statistics
                if 'document_type' in enhanced_metadata:
                    doc_type = enhanced_metadata['document_type']['type']
                    self.stats['document_types'][doc_type] = \
                        self.stats['document_types'].get(doc_type, 0) + 1
                        
            # Step 5: Knowledge integration if available
            if self.integrated_processor and result.get('chunks'):
                knowledge_result = self._integrate_with_knowledge(result)
                if knowledge_result:
                    result['knowledge_integration'] = knowledge_result
                    result['processing_steps'].append('knowledge_integration')
                    
            result['success'] = True
            result['processed_at'] = datetime.now().isoformat()
            
        except Exception as e:
            logger.error(f"Error in advanced document processing: {e}")
            result['success'] = False
            result['errors'].append(str(e))
            self.stats['processing_errors'] += 1
            
        return result
        
    def _should_use_ocr(self, file_path: str) -> bool:
        """Determine if OCR should be used for the document."""
        if not self.ocr_processor or not self.ocr_processor.available:
            return False
            
        # Check file extension
        ext = Path(file_path).suffix.lower()
        if ext not in ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
            return False
            
        # For PDFs, check if scanned
        if ext == '.pdf':
            return self.ocr_processor.is_scanned_pdf(file_path)
            
        # Images always use OCR
        return True
        
    def _process_with_ocr(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Process document with OCR."""
        logger.info(f"Processing with OCR: {file_path}")
        
        try:
            result = self.ocr_processor.process_pdf(file_path)
            
            if result['success']:
                self.stats['ocr_processed'] += 1
                
                # Check overall confidence
                confidence = self._calculate_overall_confidence(result)
                if confidence < self.ocr_confidence_threshold:
                    logger.warning(f"OCR confidence low ({confidence:.2f}): {file_path}")
                    
            return result
            
        except Exception as e:
            logger.error(f"OCR processing failed: {e}")
            return None
            
    def _calculate_overall_confidence(self, ocr_result: Dict[str, Any]) -> float:
        """Calculate overall OCR confidence from page results."""
        confidences = []
        
        for page in ocr_result.get('pages', []):
            if 'confidence' in page:
                confidences.append(page['confidence'])
                
        return sum(confidences) / len(confidences) if confidences else 0.0
        
    def _process_content(self, content: str, file_path: str, doc_type: Optional[str]) -> Dict[str, Any]:
        """Process text content through the pipeline."""
        if not self.enhanced_processor:
            # Return basic result if enhanced processor not available
            return {
                'content': content,
                'source_file': file_path,
                'doc_type': doc_type,
                'chunks': [{'text': content[:1000], 'metadata': {}}],  # Simple chunking
                'success': True
            }
            
        # Create temporary file with content
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
            
        try:
            # Process through enhanced processor
            result = self.enhanced_processor.process_document(tmp_path, doc_type)
            result['content'] = content
            result['source_file'] = file_path
            return result
            
        finally:
            # Clean up
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    def _process_file(self, file_path: str, doc_type: Optional[str]) -> Dict[str, Any]:
        """Process file through standard pipeline."""
        if not self.enhanced_processor:
            # Return basic result if enhanced processor not available
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                return {
                    'content': content,
                    'source_file': file_path,
                    'doc_type': doc_type,
                    'chunks': [{'text': content[:1000], 'metadata': {}}],
                    'success': True
                }
            except Exception as e:
                logger.error(f"Error reading file: {e}")
                return {'success': False, 'error': str(e)}
                
        return self.enhanced_processor.process_document(file_path, doc_type)
        
    def _integrate_with_knowledge(self, result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Integrate processed document with knowledge base."""
        try:
            if not self.integrated_processor:
                return None
                
            # Prepare document for knowledge integration
            doc_data = {
                'content': result.get('content', ''),
                'chunks': result.get('chunks', []),
                'metadata': result.get('metadata', {}),
                'language': result.get('language', {}).get('language', 'en'),
                'document_type': result.get('metadata', {}).get('document_type', {}).get('type', 'general')
            }
            
            # Process through integrated processor
            integration_result = self.integrated_processor.process_and_store(
                result['file_path'],
                doc_data
            )
            
            return integration_result
            
        except Exception as e:
            logger.error(f"Knowledge integration failed: {e}")
            return None
            
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        return {
            'stats': self.stats,
            'ocr_available': bool(self.ocr_processor and self.ocr_processor.available),
            'language_detection_available': bool(self.language_detector),
            'metadata_extraction_available': bool(self.metadata_extractor),
            'knowledge_integration_available': bool(self.integrated_processor)
        }
        
    def batch_process(self, 
                     file_paths: List[str],
                     parallel: bool = False,
                     progress_callback: Optional[callable] = None) -> List[Dict[str, Any]]:
        """
        Process multiple documents in batch.
        
        Args:
            file_paths: List of file paths to process
            parallel: Process in parallel (not implemented yet)
            progress_callback: Callback for progress updates
            
        Returns:
            List of processing results
        """
        results = []
        total = len(file_paths)
        
        for i, file_path in enumerate(file_paths):
            try:
                result = self.process_document(file_path)
                results.append(result)
                
                if progress_callback:
                    progress_callback(i + 1, total, file_path)
                    
            except Exception as e:
                logger.error(f"Batch processing error for {file_path}: {e}")
                results.append({
                    'success': False,
                    'file_path': file_path,
                    'error': str(e)
                })
                
        return results