"""
OCR Processor for scanned PDF documents.
Part of Phase 2.7: Advanced Document Intelligence & Integration
"""

import os
import logging
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import tempfile
import shutil

try:
    import pytesseract
    from PIL import Image
    import pdf2image
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False
    Image = None  # Define Image as None when PIL is not available
    logging.warning("pytesseract, PIL or pdf2image not installed. OCR functionality will be disabled.")

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    np = None  # Define np as None when numpy is not available
    cv2 = None  # Define cv2 as None when OpenCV is not available
    logging.warning("OpenCV not installed. Advanced image preprocessing will be disabled.")

logger = logging.getLogger(__name__)


class OCRProcessor:
    """Process scanned documents using OCR technology."""
    
    def __init__(self, 
                 tesseract_cmd: Optional[str] = None,
                 lang: str = 'deu+eng',  # German + English
                 dpi: int = 300,
                 preprocess: bool = True):
        """
        Initialize OCR processor.
        
        Args:
            tesseract_cmd: Path to tesseract executable
            lang: Languages to use for OCR (tesseract format)
            dpi: DPI for PDF to image conversion
            preprocess: Whether to preprocess images for better OCR
        """
        self.lang = lang
        self.dpi = dpi
        self.preprocess = preprocess
        
        if tesseract_cmd and PYTESSERACT_AVAILABLE:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
            
        self.available = self._check_availability()
        
    def _check_availability(self) -> bool:
        """Check if OCR dependencies are available."""
        if not PYTESSERACT_AVAILABLE:
            return False
            
        try:
            # Test tesseract availability
            pytesseract.get_tesseract_version()
            return True
        except Exception as e:
            logger.error(f"Tesseract not available: {e}")
            return False
            
    def process_pdf(self, pdf_path: str, output_format: str = 'text') -> Dict[str, Any]:
        """
        Process a PDF file using OCR.
        
        Args:
            pdf_path: Path to PDF file
            output_format: 'text', 'hocr', or 'data'
            
        Returns:
            Dictionary with OCR results and metadata
        """
        if not self.available:
            return {
                'success': False,
                'error': 'OCR dependencies not available',
                'text': '',
                'pages': []
            }
            
        try:
            # Convert PDF to images
            images = pdf2image.convert_from_path(pdf_path, dpi=self.dpi)
            
            results = {
                'success': True,
                'text': '',
                'pages': [],
                'metadata': {
                    'num_pages': len(images),
                    'dpi': self.dpi,
                    'languages': self.lang,
                    'preprocessed': self.preprocess
                }
            }
            
            # Process each page
            for i, image in enumerate(images):
                page_result = self._process_image(image, output_format)
                page_result['page_num'] = i + 1
                results['pages'].append(page_result)
                
                if 'text' in page_result:
                    results['text'] += page_result['text'] + '\n\n'
                    
            return results
            
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {e}")
            return {
                'success': False,
                'error': str(e),
                'text': '',
                'pages': []
            }
            
    def _process_image(self, image: 'Image.Image', output_format: str = 'text') -> Dict[str, Any]:
        """Process a single image with OCR."""
        try:
            # Preprocess image if enabled
            if self.preprocess and CV2_AVAILABLE:
                image = self._preprocess_image(image)
                
            # Perform OCR based on output format
            if output_format == 'text':
                text = pytesseract.image_to_string(image, lang=self.lang)
                return {
                    'text': text.strip(),
                    'confidence': self._estimate_confidence(text)
                }
            elif output_format == 'hocr':
                hocr = pytesseract.image_to_pdf_or_hocr(image, lang=self.lang, extension='hocr')
                return {'hocr': hocr.decode('utf-8')}
            elif output_format == 'data':
                data = pytesseract.image_to_data(image, lang=self.lang, output_type=pytesseract.Output.DICT)
                return {'data': data}
            else:
                raise ValueError(f"Unknown output format: {output_format}")
                
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return {'error': str(e)}
            
    def _preprocess_image(self, image: 'Image.Image') -> 'Image.Image':
        """Preprocess image for better OCR results."""
        if not CV2_AVAILABLE:
            return image
            
        try:
            # Convert PIL Image to OpenCV format
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            
            # Apply thresholding to get binary image
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Denoise
            denoised = cv2.fastNlMeansDenoising(thresh)
            
            # Deskew
            angle = self._get_skew_angle(denoised)
            if abs(angle) > 0.5:
                denoised = self._rotate_image(denoised, angle)
                
            # Convert back to PIL Image
            return Image.fromarray(denoised)
            
        except Exception as e:
            logger.warning(f"Image preprocessing failed: {e}")
            return image
            
    def _get_skew_angle(self, image: 'np.ndarray') -> float:
        """Detect skew angle of text in image."""
        try:
            # Find all contours
            contours, _ = cv2.findContours(image, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter text-like contours
            min_area = 10
            text_contours = [c for c in contours if cv2.contourArea(c) > min_area]
            
            if not text_contours:
                return 0.0
                
            # Get minimum area rectangle for all text contours
            all_points = np.vstack(text_contours)
            rect = cv2.minAreaRect(all_points)
            angle = rect[-1]
            
            # Normalize angle
            if angle < -45:
                angle = -(90 + angle)
            elif angle > 45:
                angle = -(90 - angle)
                
            return angle
            
        except Exception:
            return 0.0
            
    def _rotate_image(self, image: 'np.ndarray', angle: float) -> 'np.ndarray':
        """Rotate image by given angle."""
        height, width = image.shape[:2]
        center = (width // 2, height // 2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        # Calculate new dimensions
        cos = np.abs(matrix[0, 0])
        sin = np.abs(matrix[0, 1])
        new_width = int((height * sin) + (width * cos))
        new_height = int((height * cos) + (width * sin))
        
        # Adjust rotation matrix
        matrix[0, 2] += (new_width / 2) - center[0]
        matrix[1, 2] += (new_height / 2) - center[1]
        
        return cv2.warpAffine(image, matrix, (new_width, new_height), 
                              flags=cv2.INTER_CUBIC, borderValue=255)
                              
    def _estimate_confidence(self, text: str) -> float:
        """Estimate OCR confidence based on text characteristics."""
        if not text:
            return 0.0
            
        # Simple heuristic based on text quality indicators
        words = text.split()
        if not words:
            return 0.0
            
        # Count valid words (length > 2, contains letters)
        valid_words = sum(1 for w in words if len(w) > 2 and any(c.isalpha() for c in w))
        
        # Calculate confidence
        confidence = valid_words / len(words)
        
        # Penalty for too many special characters
        special_chars = sum(1 for c in text if not c.isalnum() and not c.isspace())
        char_ratio = special_chars / len(text)
        if char_ratio > 0.3:
            confidence *= 0.7
            
        return min(confidence, 1.0)
        
    def is_scanned_pdf(self, pdf_path: str) -> bool:
        """
        Check if a PDF is scanned (image-based) or has extractable text.
        
        Returns:
            True if PDF appears to be scanned, False otherwise
        """
        try:
            import PyPDF2
            
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                
                # Check first few pages for text
                pages_to_check = min(3, len(reader.pages))
                total_text = ""
                
                for i in range(pages_to_check):
                    page = reader.pages[i]
                    text = page.extract_text()
                    total_text += text
                    
                # If very little text found, likely scanned
                return len(total_text.strip()) < 50
                
        except Exception as e:
            logger.warning(f"Could not determine if PDF is scanned: {e}")
            # Assume it might be scanned
            return True