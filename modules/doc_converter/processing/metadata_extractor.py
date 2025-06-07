import os
import logging
from datetime import datetime
from pathlib import Path
import mimetypes
import hashlib
from typing import Dict, Any, Optional

# Try to import optional dependencies
try:
    import PyPDF2
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False

try:
    from PIL import Image
    from PIL.ExifTags import TAGS
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import python_docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

logger = logging.getLogger(__name__)

def extract_metadata(file_path: str) -> Dict[str, Any]:
    """Extract metadata from various document types"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    path = Path(file_path)
    
    # Basic metadata
    metadata = {
        'filename': path.name,
        'file_path': str(path.absolute()),
        'file_size': os.path.getsize(file_path),
        'file_size_mb': round(os.path.getsize(file_path) / (1024 * 1024), 2),
        'created_at': datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
        'modified_at': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
        'extension': path.suffix.lower(),
        'mime_type': mimetypes.guess_type(file_path)[0] or 'application/octet-stream',
        'checksum': calculate_checksum(file_path)
    }
    
    # Extract format-specific metadata
    if metadata['extension'] == '.pdf' and HAS_PYPDF2:
        metadata.update(extract_pdf_metadata(file_path))
    elif metadata['extension'] in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp'] and HAS_PIL:
        metadata.update(extract_image_metadata(file_path))
    elif metadata['extension'] in ['.docx'] and HAS_DOCX:
        metadata.update(extract_docx_metadata(file_path))
    elif metadata['extension'] in ['.txt', '.md', '.csv']:
        metadata.update(extract_text_metadata(file_path))
    
    return metadata

def calculate_checksum(file_path: str, algorithm: str = 'sha256') -> str:
    """Calculate file checksum"""
    hash_func = hashlib.new(algorithm)
    
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            hash_func.update(chunk)
    
    return hash_func.hexdigest()

def extract_pdf_metadata(file_path: str) -> Dict[str, Any]:
    """Extract metadata from PDF files"""
    metadata = {
        'format': 'PDF',
        'pages': 0,
        'pdf_version': None,
        'is_encrypted': False,
        'has_forms': False,
        'has_annotations': False
    }
    
    try:
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            
            metadata['pages'] = len(reader.pages)
            metadata['is_encrypted'] = reader.is_encrypted
            
            # Extract document info
            if reader.metadata:
                info = reader.metadata
                metadata['title'] = info.get('/Title', '')
                metadata['author'] = info.get('/Author', '')
                metadata['subject'] = info.get('/Subject', '')
                metadata['creator'] = info.get('/Creator', '')
                metadata['producer'] = info.get('/Producer', '')
                
                # Parse creation date
                if '/CreationDate' in info:
                    try:
                        creation_date = info['/CreationDate']
                        if creation_date.startswith('D:'):
                            creation_date = creation_date[2:]
                        metadata['pdf_created'] = creation_date
                    except:
                        pass
            
            # Check for forms and annotations
            for page in reader.pages:
                if '/Annots' in page:
                    metadata['has_annotations'] = True
                if '/AcroForm' in reader.trailer['/Root']:
                    metadata['has_forms'] = True
                    break
    
    except Exception as e:
        logger.error(f"Error extracting PDF metadata: {str(e)}")
        metadata['error'] = str(e)
    
    return metadata

def extract_image_metadata(file_path: str) -> Dict[str, Any]:
    """Extract metadata from image files"""
    metadata = {
        'format': 'Image',
        'width': 0,
        'height': 0,
        'mode': '',
        'has_exif': False
    }
    
    try:
        with Image.open(file_path) as img:
            metadata['width'] = img.width
            metadata['height'] = img.height
            metadata['mode'] = img.mode
            metadata['format_description'] = img.format_description
            
            # Extract EXIF data
            exifdata = img.getexif()
            if exifdata:
                metadata['has_exif'] = True
                exif_dict = {}
                
                for tag_id in exifdata:
                    tag = TAGS.get(tag_id, tag_id)
                    data = exifdata.get(tag_id)
                    
                    # Convert bytes to string
                    if isinstance(data, bytes):
                        try:
                            data = data.decode()
                        except:
                            data = str(data)
                    
                    exif_dict[tag] = data
                
                # Extract common EXIF fields
                metadata['camera_make'] = exif_dict.get('Make', '')
                metadata['camera_model'] = exif_dict.get('Model', '')
                metadata['datetime_original'] = exif_dict.get('DateTimeOriginal', '')
                metadata['gps_info'] = exif_dict.get('GPSInfo', {})
                metadata['orientation'] = exif_dict.get('Orientation', 1)
    
    except Exception as e:
        logger.error(f"Error extracting image metadata: {str(e)}")
        metadata['error'] = str(e)
    
    return metadata

def extract_docx_metadata(file_path: str) -> Dict[str, Any]:
    """Extract metadata from DOCX files"""
    metadata = {
        'format': 'DOCX',
        'paragraphs': 0,
        'tables': 0,
        'images': 0,
        'sections': 0,
        'word_count': 0
    }
    
    try:
        doc = python_docx.Document(file_path)
        
        # Count elements
        metadata['paragraphs'] = len(doc.paragraphs)
        metadata['tables'] = len(doc.tables)
        metadata['sections'] = len(doc.sections)
        
        # Count words
        word_count = 0
        for paragraph in doc.paragraphs:
            word_count += len(paragraph.text.split())
        metadata['word_count'] = word_count
        
        # Extract core properties
        core_props = doc.core_properties
        metadata['title'] = core_props.title or ''
        metadata['author'] = core_props.author or ''
        metadata['subject'] = core_props.subject or ''
        metadata['keywords'] = core_props.keywords or ''
        metadata['category'] = core_props.category or ''
        metadata['comments'] = core_props.comments or ''
        
        if core_props.created:
            metadata['docx_created'] = core_props.created.isoformat()
        if core_props.modified:
            metadata['docx_modified'] = core_props.modified.isoformat()
        
        metadata['revision'] = core_props.revision
        metadata['last_modified_by'] = core_props.last_modified_by or ''
    
    except Exception as e:
        logger.error(f"Error extracting DOCX metadata: {str(e)}")
        metadata['error'] = str(e)
    
    return metadata

def extract_text_metadata(file_path: str) -> Dict[str, Any]:
    """Extract metadata from text files"""
    metadata = {
        'format': 'Text',
        'lines': 0,
        'words': 0,
        'characters': 0,
        'encoding': 'unknown'
    }
    
    try:
        # Detect encoding
        import chardet
        with open(file_path, 'rb') as f:
            raw_data = f.read(10000)  # Read first 10KB
            result = chardet.detect(raw_data)
            metadata['encoding'] = result['encoding'] or 'utf-8'
            metadata['encoding_confidence'] = result.get('confidence', 0)
        
        # Read file with detected encoding
        with open(file_path, 'r', encoding=metadata['encoding'], errors='ignore') as f:
            content = f.read()
            
            metadata['lines'] = content.count('\n') + 1
            metadata['words'] = len(content.split())
            metadata['characters'] = len(content)
            
            # Check for common patterns
            if file_path.endswith('.csv'):
                lines = content.split('\n')
                if lines:
                    metadata['columns'] = len(lines[0].split(','))
                    metadata['rows'] = len(lines) - 1  # Exclude header
    
    except Exception as e:
        logger.error(f"Error extracting text metadata: {str(e)}")
        metadata['error'] = str(e)
    
    return metadata

def extract_advanced_metadata(file_path: str) -> Dict[str, Any]:
    """Extract advanced metadata including content analysis"""
    metadata = extract_metadata(file_path)
    
    # Add content-based metadata
    if metadata.get('format') == 'PDF' and metadata.get('pages', 0) > 0:
        # Analyze first page for document type hints
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            first_page_text = doc[0].get_text()[:1000].lower()
            doc.close()
            
            # Document type detection
            if any(word in first_page_text for word in ['invoice', 'rechnung', 'total', 'mwst']):
                metadata['probable_type'] = 'invoice'
            elif any(word in first_page_text for word in ['contract', 'vertrag', 'agreement']):
                metadata['probable_type'] = 'contract'
            elif any(word in first_page_text for word in ['report', 'bericht', 'summary']):
                metadata['probable_type'] = 'report'
            else:
                metadata['probable_type'] = 'general'
        except:
            pass
    
    return metadata