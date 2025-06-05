"""
Enhanced Metadata Extractor for documents.
Part of Phase 2.7: Advanced Document Intelligence & Integration
"""

import logging
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import hashlib
import mimetypes

try:
    import dateutil.parser
    DATEUTIL_AVAILABLE = True
except ImportError:
    DATEUTIL_AVAILABLE = False
    logging.warning("python-dateutil not installed. Date parsing will be limited.")

try:
    from PIL import Image
    from PIL.ExifTags import TAGS
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logging.warning("PIL not installed. Image metadata extraction will be limited.")

logger = logging.getLogger(__name__)


class EnhancedMetadataExtractor:
    """Extract and enrich metadata from various document types."""
    
    # Common metadata patterns
    PATTERNS = {
        'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        'phone': re.compile(r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}'),
        'url': re.compile(r'https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)'),
        'date': re.compile(r'\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b'),
        'time': re.compile(r'\b(?:[01]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?\b'),
        'currency': re.compile(r'[€$£¥]\s*\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s*(?:EUR|USD|GBP|JPY)'),
        'percentage': re.compile(r'\b\d+(?:[.,]\d+)?\s*%'),
        'reference_number': re.compile(r'\b(?:REF|ID|NO|NR)[:\s]*[A-Z0-9-]+\b', re.IGNORECASE),
    }
    
    # Document type indicators
    DOCUMENT_TYPES = {
        'invoice': ['rechnung', 'invoice', 'faktura', 'bill', 'rechnungsnummer', 'invoice number'],
        'contract': ['vertrag', 'contract', 'agreement', 'vereinbarung', 'kontrakt'],
        'report': ['bericht', 'report', 'analyse', 'analysis', 'auswertung'],
        'email': ['from:', 'to:', 'subject:', 'date:', 'von:', 'an:', 'betreff:'],
        'letter': ['sehr geehrte', 'dear', 'mit freundlichen grüßen', 'sincerely', 'best regards'],
        'form': ['formular', 'form', 'antrag', 'application', 'ausfüllen', 'fill out'],
        'manual': ['anleitung', 'manual', 'guide', 'handbuch', 'bedienungsanleitung'],
        'presentation': ['slide', 'folie', 'präsentation', 'presentation', 'agenda'],
    }
    
    def __init__(self, extract_entities: bool = True, extract_dates: bool = True):
        """
        Initialize metadata extractor.
        
        Args:
            extract_entities: Extract named entities from text
            extract_dates: Extract and parse dates
        """
        self.extract_entities = extract_entities
        self.extract_dates = extract_dates
        
    def extract_metadata(self, 
                        content: str, 
                        file_path: Optional[str] = None,
                        existing_metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Extract comprehensive metadata from document.
        
        Args:
            content: Document text content
            file_path: Optional file path for additional metadata
            existing_metadata: Existing metadata to enhance
            
        Returns:
            Enhanced metadata dictionary
        """
        metadata = existing_metadata or {}
        
        # Basic file metadata
        if file_path:
            metadata.update(self._extract_file_metadata(file_path))
            
        # Content-based metadata
        metadata.update({
            'content_length': len(content),
            'word_count': len(content.split()),
            'line_count': content.count('\n') + 1,
            'language': 'auto',  # Will be set by language detector
        })
        
        # Extract patterns
        patterns_found = self._extract_patterns(content)
        if patterns_found:
            metadata['extracted_patterns'] = patterns_found
            
        # Detect document type
        doc_type = self._detect_document_type(content)
        if doc_type:
            metadata['document_type'] = doc_type
            metadata['document_type_confidence'] = doc_type['confidence']
            
        # Extract dates
        if self.extract_dates:
            dates = self._extract_dates(content)
            if dates:
                metadata['extracted_dates'] = dates
                
        # Extract key-value pairs
        kv_pairs = self._extract_key_value_pairs(content)
        if kv_pairs:
            metadata['key_value_pairs'] = kv_pairs
            
        # Calculate content hash
        metadata['content_hash'] = self._calculate_hash(content)
        
        # Extract summary statistics
        metadata['statistics'] = self._extract_statistics(content)
        
        return metadata
        
    def _extract_file_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract metadata from file system."""
        path = Path(file_path)
        
        metadata = {
            'file_name': path.name,
            'file_extension': path.suffix.lower(),
            'file_size_bytes': path.stat().st_size if path.exists() else 0,
            'mime_type': mimetypes.guess_type(file_path)[0],
        }
        
        if path.exists():
            stat = path.stat()
            metadata.update({
                'created_time': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'modified_time': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })
            
        # Extract image metadata if applicable
        if path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp'] and PIL_AVAILABLE:
            image_metadata = self._extract_image_metadata(file_path)
            if image_metadata:
                metadata['image_metadata'] = image_metadata
                
        return metadata
        
    def _extract_patterns(self, content: str) -> Dict[str, List[str]]:
        """Extract various patterns from content."""
        found = {}
        
        for pattern_name, pattern in self.PATTERNS.items():
            matches = pattern.findall(content)
            if matches:
                # Deduplicate and limit
                unique_matches = list(set(matches))[:10]
                if unique_matches:
                    found[pattern_name] = unique_matches
                    
        return found
        
    def _detect_document_type(self, content: str) -> Optional[Dict[str, Any]]:
        """Detect document type based on content indicators."""
        content_lower = content.lower()
        scores = {}
        
        for doc_type, indicators in self.DOCUMENT_TYPES.items():
            score = sum(1 for indicator in indicators if indicator in content_lower)
            if score > 0:
                scores[doc_type] = score
                
        if not scores:
            return None
            
        # Get best match
        best_type = max(scores, key=scores.get)
        total_indicators = len(self.DOCUMENT_TYPES[best_type])
        confidence = scores[best_type] / total_indicators
        
        return {
            'type': best_type,
            'confidence': min(confidence, 1.0),
            'indicators_found': scores[best_type]
        }
        
    def _extract_dates(self, content: str) -> List[Dict[str, Any]]:
        """Extract and parse dates from content."""
        dates = []
        
        # Find date patterns
        date_matches = self.PATTERNS['date'].findall(content)
        
        for match in date_matches[:10]:  # Limit to first 10
            parsed_date = self._parse_date(match)
            if parsed_date:
                dates.append({
                    'original': match,
                    'parsed': parsed_date.isoformat(),
                    'format': self._detect_date_format(match)
                })
                
        return dates
        
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime object."""
        if DATEUTIL_AVAILABLE:
            try:
                # Try dateutil parser
                return dateutil.parser.parse(date_str, dayfirst=True)
            except:
                pass
                
        # Fallback to manual parsing
        formats = [
            '%d.%m.%Y', '%d-%m-%Y', '%d/%m/%Y',
            '%Y-%m-%d', '%Y.%m.%d', '%Y/%m/%d',
            '%d.%m.%y', '%d-%m-%y', '%d/%m/%y',
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
                
        return None
        
    def _detect_date_format(self, date_str: str) -> str:
        """Detect the format of a date string."""
        if '.' in date_str:
            return 'DD.MM.YYYY' if len(date_str.split('.')[-1]) == 4 else 'DD.MM.YY'
        elif '-' in date_str:
            parts = date_str.split('-')
            if len(parts[0]) == 4:
                return 'YYYY-MM-DD'
            else:
                return 'DD-MM-YYYY' if len(parts[-1]) == 4 else 'DD-MM-YY'
        elif '/' in date_str:
            parts = date_str.split('/')
            if len(parts[0]) == 4:
                return 'YYYY/MM/DD'
            else:
                return 'DD/MM/YYYY' if len(parts[-1]) == 4 else 'DD/MM/YY'
        return 'unknown'
        
    def _extract_key_value_pairs(self, content: str) -> Dict[str, str]:
        """Extract key-value pairs from content."""
        kv_pairs = {}
        
        # Common patterns for key-value pairs
        patterns = [
            re.compile(r'([A-Za-z\s]+):\s*([^\n]+)'),
            re.compile(r'([A-Za-z\s]+)\s*=\s*([^\n]+)'),
            re.compile(r'([A-Za-z\s]+)\s*-\s*([^\n]+)'),
        ]
        
        for pattern in patterns:
            matches = pattern.findall(content)
            for key, value in matches[:20]:  # Limit pairs
                key = key.strip()
                value = value.strip()
                if 2 <= len(key) <= 50 and value and len(value) < 200:
                    kv_pairs[key] = value
                    
        return kv_pairs
        
    def _calculate_hash(self, content: str) -> str:
        """Calculate content hash."""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
        
    def _extract_statistics(self, content: str) -> Dict[str, Any]:
        """Extract statistical information from content."""
        words = content.split()
        sentences = re.split(r'[.!?]+', content)
        
        stats = {
            'avg_word_length': sum(len(w) for w in words) / len(words) if words else 0,
            'avg_sentence_length': sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0,
            'uppercase_ratio': sum(1 for c in content if c.isupper()) / len(content) if content else 0,
            'digit_ratio': sum(1 for c in content if c.isdigit()) / len(content) if content else 0,
            'special_char_ratio': sum(1 for c in content if not c.isalnum() and not c.isspace()) / len(content) if content else 0,
        }
        
        return {k: round(v, 3) for k, v in stats.items()}
        
    def _extract_image_metadata(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Extract metadata from image files."""
        if not PIL_AVAILABLE:
            return None
            
        try:
            with Image.open(file_path) as img:
                metadata = {
                    'width': img.width,
                    'height': img.height,
                    'format': img.format,
                    'mode': img.mode,
                }
                
                # Extract EXIF data
                exifdata = img.getexif()
                if exifdata:
                    exif = {}
                    for tag_id, value in exifdata.items():
                        tag = TAGS.get(tag_id, tag_id)
                        exif[tag] = str(value)
                    metadata['exif'] = exif
                    
                return metadata
                
        except Exception as e:
            logger.warning(f"Could not extract image metadata: {e}")
            return None