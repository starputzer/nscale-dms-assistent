"""
Enhanced Document Processor for Optimized Content Extraction
Provides advanced processing capabilities based on document type and structure
"""

import re
import json
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import logging

from modules.core.logging import LogManager
from modules.doc_converter.document_classifier import (
    DocumentType, 
    ContentCategory, 
    StructureType,
    ProcessingStrategy,
    DocumentMetadata,
    ClassificationResult
)


@dataclass
class TableContext:
    """Represents a table with preserved context"""
    table_id: str
    headers: List[str]
    rows: List[List[str]]
    caption: Optional[str] = None
    preceding_text: Optional[str] = None
    following_text: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CodeSnippet:
    """Represents a code block with metadata"""
    snippet_id: str
    language: Optional[str]
    code: str
    title: Optional[str] = None
    description: Optional[str] = None
    line_numbers: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Reference:
    """Represents an internal or external reference"""
    ref_id: str
    ref_type: str  # 'internal', 'external', 'footnote', 'citation'
    source_text: str
    target: str
    context: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExtractedMetadata:
    """Document metadata extracted during processing"""
    title: Optional[str] = None
    authors: List[str] = field(default_factory=list)
    version: Optional[str] = None
    date: Optional[datetime] = None
    keywords: List[str] = field(default_factory=list)
    summary: Optional[str] = None
    language: Optional[str] = None
    custom_fields: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProcessedDocument:
    """Result of enhanced document processing"""
    document_id: str
    original_path: str
    classification: ClassificationResult
    content: str
    structured_content: Dict[str, Any]
    tables: List[TableContext]
    code_snippets: List[CodeSnippet]
    references: List[Reference]
    metadata: ExtractedMetadata
    processing_time: float
    warnings: List[str] = field(default_factory=list)
    statistics: Dict[str, Any] = field(default_factory=dict)


class EnhancedProcessor:
    """
    Enhanced document processor with advanced extraction capabilities
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize the enhanced processor"""
        self.config = config or {}
        self.logger = LogManager.setup_logging(__name__)
        
        # Regex patterns for various extractions
        self.patterns = {
            # Table detection patterns
            'markdown_table': re.compile(r'(\|[^\n]+\|[\n\r]+\|[-:\s|]+\|[\n\r]+(?:\|[^\n]+\|[\n\r]*)+)', re.MULTILINE),
            'html_table': re.compile(r'<table[^>]*>.*?</table>', re.DOTALL | re.IGNORECASE),
            'ascii_table': re.compile(r'(?:^\+[-+]+\+$[\n\r]+(?:^\|[^|]+\|$[\n\r]+)+^\+[-+]+\+$)', re.MULTILINE),
            
            # Code block patterns
            'markdown_code': re.compile(r'```(\w*)\n(.*?)```', re.DOTALL),
            'html_code': re.compile(r'<code[^>]*>(.*?)</code>', re.DOTALL | re.IGNORECASE),
            'indented_code': re.compile(r'^(    |\t)(.+)$', re.MULTILINE),
            
            # Reference patterns
            'markdown_link': re.compile(r'\[([^\]]+)\]\(([^)]+)\)'),
            'url': re.compile(r'https?://[^\s<>"{}|\\^`\[\]]+'),
            'footnote': re.compile(r'\[(\d+)\]'),
            'citation': re.compile(r'\[([^\]]+\d{4}[^\]]*)\]'),
            
            # Metadata patterns
            'version': re.compile(r'(?:Version|version|Ver|ver|V|v)\.?\s*[:=]?\s*([\d.]+(?:-[\w.]+)?)', re.IGNORECASE),
            'date': re.compile(r'(?:Date|Datum|Updated|Stand)[\s:]*(\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})', re.IGNORECASE),
            'author': re.compile(r'(?:Author|Autor|By|Von)[\s:]*([^\n\r,]+(?:,\s*[^\n\r,]+)*)', re.IGNORECASE),
            'email': re.compile(r'[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}'),
        }
        
        self.logger.info("🚀 EnhancedProcessor initialized with advanced extraction capabilities")
    
    def process_document(self, 
                        file_path: str,
                        classification: ClassificationResult,
                        content: Optional[str] = None) -> ProcessedDocument:
        """
        Process a document with enhanced extraction based on classification
        
        Args:
            file_path: Path to the document
            classification: Classification result from DocumentClassifier
            content: Optional pre-extracted content
            
        Returns:
            ProcessedDocument with all extracted information
        """
        start_time = datetime.now()
        self.logger.info(f"📄 Processing document: {file_path}")
        
        try:
            # Read content if not provided
            if content is None:
                content = self._read_document_content(file_path, classification.metadata.document_type)
            
            # Initialize result
            document_id = self._generate_document_id(file_path)
            
            # Extract structured content based on strategy
            structured_content = self._extract_structured_content(
                content, 
                classification.processing_strategy,
                classification.metadata.structure_type
            )
            
            # Extract tables with context
            tables = self._extract_tables(content, classification.metadata.document_type)
            
            # Extract code snippets
            code_snippets = self._extract_code_snippets(content, classification.metadata.content_category)
            
            # Extract references
            references = self._extract_references(content)
            
            # Extract metadata
            metadata = self._extract_metadata(content, classification.metadata)
            
            # Calculate statistics
            statistics = self._calculate_statistics(content, tables, code_snippets, references)
            
            # Generate warnings
            warnings = self._generate_processing_warnings(
                classification, 
                statistics,
                len(tables),
                len(code_snippets)
            )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            result = ProcessedDocument(
                document_id=document_id,
                original_path=file_path,
                classification=classification,
                content=content,
                structured_content=structured_content,
                tables=tables,
                code_snippets=code_snippets,
                references=references,
                metadata=metadata,
                processing_time=processing_time,
                warnings=warnings,
                statistics=statistics
            )
            
            self.logger.info(f"✅ Document processed successfully in {processing_time:.2f}s")
            self.logger.info(f"📊 Extracted: {len(tables)} tables, {len(code_snippets)} code blocks, "
                           f"{len(references)} references")
            
            return result
            
        except Exception as e:
            self.logger.error(f"❌ Processing failed: {str(e)}")
            raise
    
    def process_structured_document(self, doc: Any) -> ProcessedDocument:
        """Process documents with inherent structure (e.g., DOCX, XLSX)"""
        # This method would be implemented with specific libraries for each format
        # For now, it's a placeholder for the interface
        raise NotImplementedError("Structured document processing requires format-specific implementation")
    
    def extract_table_contexts(self, content: str, doc_type: DocumentType) -> List[TableContext]:
        """Extract tables with surrounding context"""
        return self._extract_tables(content, doc_type)
    
    def preserve_formatting_context(self, content: str) -> Dict[str, Any]:
        """Preserve important formatting information"""
        formatting = {
            'has_headers': bool(re.search(r'^#{1,6}\s+', content, re.MULTILINE)),
            'has_lists': bool(re.search(r'^\s*[-*+]\s+', content, re.MULTILINE)),
            'has_numbered_lists': bool(re.search(r'^\s*\d+\.\s+', content, re.MULTILINE)),
            'has_blockquotes': bool(re.search(r'^>\s+', content, re.MULTILINE)),
            'has_horizontal_rules': bool(re.search(r'^[-*_]{3,}\s*$', content, re.MULTILINE)),
            'emphasis_markers': {
                'bold': len(re.findall(r'\*\*[^*]+\*\*|__[^_]+__', content)),
                'italic': len(re.findall(r'\*[^*]+\*|_[^_]+_', content)),
                'code': len(re.findall(r'`[^`]+`', content))
            }
        }
        return formatting
    
    def extract_code_snippets(self, content: str) -> List[CodeSnippet]:
        """Extract all code snippets from content"""
        return self._extract_code_snippets(content, ContentCategory.GENERAL)
    
    def _read_document_content(self, file_path: str, doc_type: DocumentType) -> str:
        """Read content from document file"""
        # For now, only handle text-based formats
        if doc_type in [DocumentType.TXT, DocumentType.MARKDOWN, DocumentType.HTML, DocumentType.XML, DocumentType.JSON]:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        else:
            # For other formats, we'd need specialized libraries
            raise NotImplementedError(f"Reading {doc_type.value} files requires specialized libraries")
    
    def _generate_document_id(self, file_path: str) -> str:
        """Generate unique document ID"""
        import hashlib
        path_hash = hashlib.md5(file_path.encode()).hexdigest()[:8]
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        return f"doc_{timestamp}_{path_hash}"
    
    def _extract_structured_content(self, 
                                  content: str, 
                                  strategy: ProcessingStrategy,
                                  structure: StructureType) -> Dict[str, Any]:
        """Extract structured content based on processing strategy"""
        structured = {
            'sections': [],
            'hierarchy': {},
            'key_points': [],
            'definitions': {},
            'examples': []
        }
        
        if strategy == ProcessingStrategy.HIERARCHICAL_PRESERVE:
            structured['sections'] = self._extract_hierarchical_sections(content)
            structured['hierarchy'] = self._build_hierarchy_tree(structured['sections'])
            
        elif strategy == ProcessingStrategy.QA_EXTRACTION:
            qa_pairs = self._extract_qa_pairs(content)
            structured['qa_pairs'] = qa_pairs
            structured['sections'] = [{'title': 'Q&A', 'content': qa_pairs}]
            
        elif strategy == ProcessingStrategy.CODE_AWARE:
            # Extract code examples separately
            code_examples = self._extract_code_examples(content)
            structured['examples'] = code_examples
            
        # Extract key points for all strategies
        structured['key_points'] = self._extract_key_points(content)
        
        # Extract definitions
        structured['definitions'] = self._extract_definitions(content)
        
        return structured
    
    def _extract_hierarchical_sections(self, content: str) -> List[Dict[str, Any]]:
        """Extract hierarchical sections from content"""
        sections = []
        
        # Markdown headers
        header_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
        
        matches = list(header_pattern.finditer(content))
        
        for i, match in enumerate(matches):
            level = len(match.group(1))
            title = match.group(2).strip()
            start = match.end()
            
            # Find content until next header or end
            if i + 1 < len(matches):
                end = matches[i + 1].start()
            else:
                end = len(content)
            
            section_content = content[start:end].strip()
            
            sections.append({
                'level': level,
                'title': title,
                'content': section_content,
                'start_pos': start,
                'end_pos': end
            })
        
        return sections
    
    def _build_hierarchy_tree(self, sections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build hierarchy tree from sections"""
        if not sections:
            return {}
        
        root = {'title': 'Document', 'level': 0, 'children': []}
        stack = [root]
        
        for section in sections:
            level = section['level']
            
            # Pop stack until we find parent level
            while len(stack) > 1 and stack[-1]['level'] >= level:
                stack.pop()
            
            # Create node
            node = {
                'title': section['title'],
                'level': level,
                'children': []
            }
            
            # Add to parent's children
            stack[-1]['children'].append(node)
            stack.append(node)
        
        return root
    
    def _extract_qa_pairs(self, content: str) -> List[Dict[str, str]]:
        """Extract question-answer pairs"""
        qa_pairs = []
        
        # Pattern 1: Q: ... A: ...
        pattern1 = re.compile(r'(?:Q:|Question:|Frage:)\s*(.+?)(?:\n|\r|$)(?:A:|Answer:|Antwort:)\s*(.+?)(?=(?:Q:|Question:|Frage:|$))', re.DOTALL | re.IGNORECASE)
        
        for match in pattern1.finditer(content):
            qa_pairs.append({
                'question': match.group(1).strip(),
                'answer': match.group(2).strip()
            })
        
        # Pattern 2: **Question?** Answer
        pattern2 = re.compile(r'\*\*([^*]+\?)\*\*\s*\n([^\n]+(?:\n(?![*\n])[^\n]+)*)', re.MULTILINE)
        
        for match in pattern2.finditer(content):
            qa_pairs.append({
                'question': match.group(1).strip(),
                'answer': match.group(2).strip()
            })
        
        return qa_pairs
    
    def _extract_code_examples(self, content: str) -> List[Dict[str, Any]]:
        """Extract code examples with context"""
        examples = []
        
        # Find code blocks with preceding context
        code_pattern = re.compile(r'(?:^|\n)([^\n]*?)\n```(\w*)\n(.*?)```', re.DOTALL)
        
        for match in code_pattern.finditer(content):
            context = match.group(1).strip()
            language = match.group(2) or 'text'
            code = match.group(3).strip()
            
            examples.append({
                'context': context,
                'language': language,
                'code': code
            })
        
        return examples
    
    def _extract_key_points(self, content: str) -> List[str]:
        """Extract key points from content"""
        key_points = []
        
        # Look for bullet points at the beginning of lines
        bullet_pattern = re.compile(r'^\s*[-*•]\s+(.+)$', re.MULTILINE)
        
        for match in bullet_pattern.finditer(content):
            point = match.group(1).strip()
            # Filter out very short or very long points
            if 10 < len(point) < 200:
                key_points.append(point)
        
        # Look for numbered lists
        numbered_pattern = re.compile(r'^\s*\d+\.\s+(.+)$', re.MULTILINE)
        
        for match in numbered_pattern.finditer(content):
            point = match.group(1).strip()
            if 10 < len(point) < 200:
                key_points.append(point)
        
        # Deduplicate while preserving order
        seen = set()
        unique_points = []
        for point in key_points:
            if point.lower() not in seen:
                seen.add(point.lower())
                unique_points.append(point)
        
        return unique_points[:20]  # Limit to top 20 points
    
    def _extract_definitions(self, content: str) -> Dict[str, str]:
        """Extract term definitions"""
        definitions = {}
        
        # Pattern: Term: Definition
        pattern1 = re.compile(r'^([A-Z][A-Za-z\s]+):\s+([^.!?]+[.!?])', re.MULTILINE)
        
        for match in pattern1.finditer(content):
            term = match.group(1).strip()
            definition = match.group(2).strip()
            if len(term) < 50 and len(definition) > 20:
                definitions[term] = definition
        
        # Pattern: **Term** - Definition
        pattern2 = re.compile(r'\*\*([^*]+)\*\*\s*[-–—]\s*([^.!?\n]+[.!?]?)')
        
        for match in pattern2.finditer(content):
            term = match.group(1).strip()
            definition = match.group(2).strip()
            if len(term) < 50 and len(definition) > 20:
                definitions[term] = definition
        
        return definitions
    
    def _extract_tables(self, content: str, doc_type: DocumentType) -> List[TableContext]:
        """Extract tables with context"""
        tables = []
        table_id = 0
        
        # Extract Markdown tables
        for match in self.patterns['markdown_table'].finditer(content):
            table_text = match.group(0)
            start_pos = match.start()
            end_pos = match.end()
            
            # Parse table
            lines = table_text.strip().split('\n')
            if len(lines) >= 3:  # Header + separator + at least one row
                headers = [cell.strip() for cell in lines[0].split('|')[1:-1]]
                rows = []
                
                for line in lines[2:]:  # Skip separator line
                    cells = [cell.strip() for cell in line.split('|')[1:-1]]
                    if cells:
                        rows.append(cells)
                
                # Extract context
                preceding_text = self._extract_preceding_context(content, start_pos)
                following_text = self._extract_following_context(content, end_pos)
                caption = self._extract_table_caption(content, start_pos)
                
                table_id += 1
                tables.append(TableContext(
                    table_id=f"table_{table_id}",
                    headers=headers,
                    rows=rows,
                    caption=caption,
                    preceding_text=preceding_text,
                    following_text=following_text,
                    metadata={'format': 'markdown', 'position': start_pos}
                ))
        
        return tables
    
    def _extract_code_snippets(self, content: str, category: ContentCategory) -> List[CodeSnippet]:
        """Extract code snippets with metadata"""
        snippets = []
        snippet_id = 0
        
        # Extract fenced code blocks
        for match in self.patterns['markdown_code'].finditer(content):
            language = match.group(1) or 'text'
            code = match.group(2).strip()
            
            # Extract title/description from preceding line
            start_pos = match.start()
            title, description = self._extract_code_context(content, start_pos)
            
            snippet_id += 1
            snippets.append(CodeSnippet(
                snippet_id=f"code_{snippet_id}",
                language=language,
                code=code,
                title=title,
                description=description,
                metadata={'position': start_pos, 'length': len(code)}
            ))
        
        return snippets
    
    def _extract_references(self, content: str) -> List[Reference]:
        """Extract all types of references"""
        references = []
        ref_id = 0
        
        # Extract markdown links
        for match in self.patterns['markdown_link'].finditer(content):
            ref_id += 1
            references.append(Reference(
                ref_id=f"ref_{ref_id}",
                ref_type='internal' if match.group(2).startswith('#') else 'external',
                source_text=match.group(1),
                target=match.group(2),
                context=self._extract_reference_context(content, match.start()),
                metadata={'position': match.start()}
            ))
        
        # Extract URLs
        for match in self.patterns['url'].finditer(content):
            # Skip if already part of a markdown link
            if not any(ref.target == match.group(0) for ref in references):
                ref_id += 1
                references.append(Reference(
                    ref_id=f"ref_{ref_id}",
                    ref_type='external',
                    source_text=match.group(0),
                    target=match.group(0),
                    context=self._extract_reference_context(content, match.start()),
                    metadata={'position': match.start()}
                ))
        
        return references
    
    def _extract_metadata(self, content: str, doc_metadata: DocumentMetadata) -> ExtractedMetadata:
        """Extract document metadata"""
        metadata = ExtractedMetadata()
        
        # Extract title (first heading or filename)
        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        if title_match:
            metadata.title = title_match.group(1).strip()
        else:
            metadata.title = Path(doc_metadata.filename).stem
        
        # Extract version
        version_match = self.patterns['version'].search(content[:1000])  # Check first 1000 chars
        if version_match:
            metadata.version = version_match.group(1)
        
        # Extract date
        date_match = self.patterns['date'].search(content[:1000])
        if date_match:
            # Parse date (simplified)
            metadata.date = datetime.now()  # Would need proper date parsing
        
        # Extract authors
        author_match = self.patterns['author'].search(content[:1000])
        if author_match:
            authors_text = author_match.group(1)
            metadata.authors = [a.strip() for a in authors_text.split(',')]
        
        # Extract keywords (from hashtags or keywords section)
        keyword_pattern = re.compile(r'(?:Keywords?|Schlagw[öo]rter?|Tags?)[\s:]*([^\n]+)', re.IGNORECASE)
        keyword_match = keyword_pattern.search(content)
        if keyword_match:
            keywords_text = keyword_match.group(1)
            metadata.keywords = [k.strip() for k in re.split(r'[,;]', keywords_text)]
        
        # Set language from classification
        metadata.language = doc_metadata.language
        
        return metadata
    
    def _extract_preceding_context(self, content: str, position: int, max_length: int = 200) -> str:
        """Extract text preceding a position"""
        start = max(0, position - max_length)
        preceding = content[start:position].strip()
        
        # Try to start at sentence boundary
        sentence_start = preceding.rfind('. ')
        if sentence_start > 0:
            preceding = preceding[sentence_start + 2:]
        
        return preceding
    
    def _extract_following_context(self, content: str, position: int, max_length: int = 200) -> str:
        """Extract text following a position"""
        end = min(len(content), position + max_length)
        following = content[position:end].strip()
        
        # Try to end at sentence boundary
        sentence_end = following.find('. ')
        if sentence_end > 0:
            following = following[:sentence_end + 1]
        
        return following
    
    def _extract_table_caption(self, content: str, table_position: int) -> Optional[str]:
        """Extract table caption if present"""
        # Look for caption before table
        before_table = content[max(0, table_position - 200):table_position]
        
        # Common patterns for table captions
        caption_patterns = [
            r'(?:Table|Tabelle)\s*\d*\s*[:.]\s*([^\n]+)$',
            r'^([^\n]+):?\s*$'  # Line immediately before table
        ]
        
        for pattern in caption_patterns:
            match = re.search(pattern, before_table, re.MULTILINE | re.IGNORECASE)
            if match:
                caption = match.group(1).strip()
                if 5 < len(caption) < 200:  # Reasonable caption length
                    return caption
        
        return None
    
    def _extract_code_context(self, content: str, code_position: int) -> Tuple[Optional[str], Optional[str]]:
        """Extract title and description for code snippet"""
        before_code = content[max(0, code_position - 500):code_position]
        
        # Look for title pattern
        title = None
        description = None
        
        # Common patterns for code titles
        title_patterns = [
            r'(?:Example|Beispiel|Code|Listing)\s*\d*\s*[:.]\s*([^\n]+)$',
            r'^([^\n]+):?\s*$'  # Line immediately before code
        ]
        
        for pattern in title_patterns:
            match = re.search(pattern, before_code, re.MULTILINE | re.IGNORECASE)
            if match:
                title = match.group(1).strip()
                break
        
        # Extract description (paragraph before code)
        lines = before_code.strip().split('\n')
        if len(lines) >= 2:
            # Check if second-to-last line looks like description
            potential_desc = lines[-2].strip()
            if len(potential_desc) > 20 and not potential_desc.endswith(':'):
                description = potential_desc
        
        return title, description
    
    def _extract_reference_context(self, content: str, ref_position: int) -> str:
        """Extract context around a reference"""
        # Get surrounding sentence
        start = max(0, ref_position - 100)
        end = min(len(content), ref_position + 100)
        context = content[start:end]
        
        # Try to get complete sentence
        sentence_start = context.rfind('. ')
        sentence_end = context.find('. ', 100)
        
        if sentence_start > 0:
            context = context[sentence_start + 2:]
        if sentence_end > 0:
            context = context[:sentence_end + 1]
        
        return context.strip()
    
    def _calculate_statistics(self, 
                            content: str, 
                            tables: List[TableContext],
                            code_snippets: List[CodeSnippet],
                            references: List[Reference]) -> Dict[str, Any]:
        """Calculate document statistics"""
        # Text statistics
        words = len(content.split())
        sentences = len(re.findall(r'[.!?]+', content))
        paragraphs = len(re.findall(r'\n\n+', content)) + 1
        
        # Structure statistics
        headings = len(re.findall(r'^#{1,6}\s+', content, re.MULTILINE))
        lists = len(re.findall(r'^\s*[-*+]\s+', content, re.MULTILINE))
        
        # Code statistics
        total_code_lines = sum(len(snippet.code.split('\n')) for snippet in code_snippets)
        code_languages = list(set(snippet.language for snippet in code_snippets if snippet.language))
        
        # Reference statistics
        internal_refs = len([r for r in references if r.ref_type == 'internal'])
        external_refs = len([r for r in references if r.ref_type == 'external'])
        
        return {
            'text': {
                'words': words,
                'sentences': sentences,
                'paragraphs': paragraphs,
                'avg_sentence_length': words / sentences if sentences > 0 else 0
            },
            'structure': {
                'headings': headings,
                'lists': lists,
                'tables': len(tables),
                'code_blocks': len(code_snippets)
            },
            'code': {
                'total_snippets': len(code_snippets),
                'total_lines': total_code_lines,
                'languages': code_languages
            },
            'references': {
                'total': len(references),
                'internal': internal_refs,
                'external': external_refs
            }
        }
    
    def _generate_processing_warnings(self,
                                    classification: ClassificationResult,
                                    statistics: Dict[str, Any],
                                    table_count: int,
                                    code_count: int) -> List[str]:
        """Generate warnings based on processing results"""
        warnings = []
        
        # Check for complex tables
        if table_count > 10:
            warnings.append(f"Document contains {table_count} tables - consider table optimization")
        
        # Check for code-heavy documents
        if code_count > 20:
            warnings.append(f"Document contains {code_count} code snippets - consider code indexing")
        
        # Check for very long documents
        if statistics['text']['words'] > 10000:
            warnings.append("Large document - consider splitting into sections")
        
        # Check for missing structure
        if statistics['structure']['headings'] == 0 and statistics['text']['words'] > 500:
            warnings.append("No headings found - document structure may be unclear")
        
        # Add classification warnings
        warnings.extend(classification.warnings)
        
        return warnings


def create_enhanced_processor(config: Optional[Dict[str, Any]] = None) -> EnhancedProcessor:
    """Factory function to create an enhanced processor"""
    return EnhancedProcessor(config)


if __name__ == "__main__":
    # Example usage
    import sys
    from modules.doc_converter.document_classifier import DocumentClassifier
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        
        # First classify the document
        classifier = DocumentClassifier()
        classification = classifier.classify_document(file_path)
        
        # Then process with enhanced extraction
        processor = EnhancedProcessor()
        result = processor.process_document(file_path, classification)
        
        print(f"\n📄 Enhanced Processing Results")
        print(f"{'='*60}")
        print(f"Document ID: {result.document_id}")
        print(f"Processing Time: {result.processing_time:.2f}s")
        print(f"\n📊 Statistics:")
        print(f"  - Words: {result.statistics['text']['words']}")
        print(f"  - Tables: {len(result.tables)}")
        print(f"  - Code Snippets: {len(result.code_snippets)}")
        print(f"  - References: {len(result.references)}")
        
        if result.metadata.title:
            print(f"\n📋 Metadata:")
            print(f"  - Title: {result.metadata.title}")
            if result.metadata.version:
                print(f"  - Version: {result.metadata.version}")
            if result.metadata.authors:
                print(f"  - Authors: {', '.join(result.metadata.authors)}")
        
        if result.warnings:
            print(f"\n⚠️  Warnings:")
            for warning in result.warnings:
                print(f"  - {warning}")
    else:
        print("Usage: python enhanced_processor.py <file_path>")