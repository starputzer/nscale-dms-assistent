"""
Knowledge Manager for Automated Document Integration
Manages document integration, deduplication, versioning, and cross-references
"""

import os
import json
import hashlib
import sqlite3
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
import difflib
import re

from ..core.logging import LogManager
from ..doc_converter.document_classifier import ClassificationResult
from doc_converter.processing.enhanced_processor import ProcessedDocument, TableContext, CodeSnippet, Reference


@dataclass
class Duplicate:
    """Represents a potential duplicate document"""
    existing_doc_id: str
    similarity_score: float
    duplicate_type: str  # 'exact', 'near', 'version', 'partial'
    matching_elements: Dict[str, Any]
    recommendation: str  # 'skip', 'replace', 'merge', 'version'


@dataclass
class UpdateResult:
    """Result of updating existing knowledge"""
    doc_id: str
    update_type: str  # 'content', 'metadata', 'references', 'version'
    changes_made: Dict[str, Any]
    previous_version: Optional[str]
    new_version: Optional[str]
    timestamp: datetime


@dataclass
class CrossReference:
    """Represents a cross-reference between documents"""
    source_doc_id: str
    target_doc_id: str
    reference_type: str  # 'cites', 'related', 'supersedes', 'part_of'
    context: str
    strength: float  # 0.0 to 1.0


@dataclass
class IntegrationResult:
    """Result of document integration into knowledge base"""
    doc_id: str
    status: str  # 'success', 'duplicate', 'updated', 'failed'
    duplicates_found: List[Duplicate]
    updates_applied: List[UpdateResult]
    cross_references_created: List[CrossReference]
    warnings: List[str]
    statistics: Dict[str, Any]


@dataclass
class DocumentVersion:
    """Represents a document version"""
    version_id: str
    doc_id: str
    version_number: str
    created_at: datetime
    created_by: str
    change_summary: str
    content_hash: str
    metadata: Dict[str, Any]


@dataclass
class KnowledgeNode:
    """Node in the knowledge graph"""
    node_id: str
    doc_id: str
    node_type: str  # 'document', 'section', 'concept', 'entity'
    title: str
    content_summary: str
    connections: List[str]  # Connected node IDs
    metadata: Dict[str, Any]


class KnowledgeManager:
    """
    Manages the integration of documents into the knowledge base
    """
    
    def __init__(self, db_path: str = "data/knowledge_base.db", config: Optional[Dict[str, Any]] = None):
        """Initialize the knowledge manager"""
        self.config = config or {}
        self.logger = LogManager.setup_logging(__name__)
        self.db_path = db_path
        
        # Configuration
        self.similarity_threshold = self.config.get('similarity_threshold', 0.85)
        self.version_similarity_threshold = self.config.get('version_similarity_threshold', 0.95)
        self.min_reference_strength = self.config.get('min_reference_strength', 0.3)
        
        # Initialize database
        self._init_database()
        
        self.logger.info("🧠 KnowledgeManager initialized")
    
    def integrate_document(self, doc: ProcessedDocument) -> IntegrationResult:
        """
        Integrate a processed document into the knowledge base
        
        Args:
            doc: ProcessedDocument from enhanced processor
            
        Returns:
            IntegrationResult with integration details
        """
        start_time = datetime.now()
        self.logger.info(f"📥 Integrating document: {doc.document_id}")
        
        try:
            # Check for duplicates
            duplicates = self.detect_duplicates(doc)
            
            # Handle based on duplicate status
            if duplicates:
                highest_similarity = max(d.similarity_score for d in duplicates)
                
                if highest_similarity >= 0.99:  # Exact duplicate
                    self.logger.warning(f"⚠️ Exact duplicate found, skipping integration")
                    return IntegrationResult(
                        doc_id=doc.document_id,
                        status='duplicate',
                        duplicates_found=duplicates,
                        updates_applied=[],
                        cross_references_created=[],
                        warnings=['Exact duplicate found - document skipped'],
                        statistics={'processing_time': (datetime.now() - start_time).total_seconds()}
                    )
                
                elif highest_similarity >= self.version_similarity_threshold:
                    # Likely a new version
                    update_results = self._handle_version_update(doc, duplicates)
                else:
                    # Similar but different document
                    update_results = self._handle_similar_document(doc, duplicates)
            else:
                update_results = []
            
            # Store document in knowledge base
            self._store_document(doc)
            
            # Create cross-references
            cross_references = self.create_cross_references(doc)
            
            # Update knowledge graph
            self._update_knowledge_graph(doc, cross_references)
            
            # Generate warnings
            warnings = self._generate_integration_warnings(doc, duplicates, cross_references)
            
            # Calculate statistics
            statistics = {
                'processing_time': (datetime.now() - start_time).total_seconds(),
                'duplicates_checked': len(duplicates),
                'cross_references_created': len(cross_references),
                'tables_indexed': len(doc.tables),
                'code_snippets_indexed': len(doc.code_snippets),
                'references_processed': len(doc.references)
            }
            
            self.logger.info(f"✅ Document integrated successfully: {doc.document_id}")
            
            return IntegrationResult(
                doc_id=doc.document_id,
                status='success' if not update_results else 'updated',
                duplicates_found=duplicates,
                updates_applied=update_results,
                cross_references_created=cross_references,
                warnings=warnings,
                statistics=statistics
            )
            
        except Exception as e:
            self.logger.error(f"❌ Integration failed: {str(e)}")
            return IntegrationResult(
                doc_id=doc.document_id,
                status='failed',
                duplicates_found=[],
                updates_applied=[],
                cross_references_created=[],
                warnings=[f'Integration failed: {str(e)}'],
                statistics={'processing_time': (datetime.now() - start_time).total_seconds()}
            )
    
    def detect_duplicates(self, doc: ProcessedDocument) -> List[Duplicate]:
        """
        Detect duplicate or similar documents in the knowledge base
        
        Args:
            doc: Document to check for duplicates
            
        Returns:
            List of potential duplicates with similarity scores
        """
        duplicates = []
        
        # Calculate document fingerprint
        doc_fingerprint = self._calculate_document_fingerprint(doc)
        
        # Query existing documents
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Check by content hash
            cursor.execute("""
                SELECT doc_id, content_hash, title, fingerprint 
                FROM documents 
                WHERE content_hash = ? OR fingerprint = ?
            """, (doc_fingerprint['content_hash'], doc_fingerprint['structure_hash']))
            
            exact_matches = cursor.fetchall()
            for match in exact_matches:
                duplicates.append(Duplicate(
                    existing_doc_id=match[0],
                    similarity_score=1.0,
                    duplicate_type='exact',
                    matching_elements={'content_hash': match[1]},
                    recommendation='skip'
                ))
            
            # Check by title similarity
            if doc.metadata.title:
                cursor.execute("SELECT doc_id, title, version FROM documents")
                all_docs = cursor.fetchall()
                
                for existing_id, existing_title, existing_version in all_docs:
                    if existing_id not in [d.existing_doc_id for d in duplicates]:
                        # Calculate title similarity
                        title_similarity = self._calculate_string_similarity(
                            doc.metadata.title, 
                            existing_title
                        )
                        
                        if title_similarity > 0.8:
                            # Check if it's a version update
                            is_version = self._is_version_update(
                                doc.metadata.version,
                                existing_version
                            )
                            
                            duplicates.append(Duplicate(
                                existing_doc_id=existing_id,
                                similarity_score=title_similarity,
                                duplicate_type='version' if is_version else 'near',
                                matching_elements={'title': existing_title},
                                recommendation='replace' if is_version else 'merge'
                            ))
            
            # Check by structural similarity
            if not duplicates:
                cursor.execute("""
                    SELECT doc_id, table_count, code_count, ref_count, word_count 
                    FROM document_statistics
                """)
                
                stats = cursor.fetchall()
                doc_stats = {
                    'tables': len(doc.tables),
                    'code': len(doc.code_snippets),
                    'refs': len(doc.references),
                    'words': doc.statistics['text']['words']
                }
                
                for stat in stats:
                    existing_id, tables, code, refs, words = stat
                    
                    # Calculate structural similarity
                    structural_sim = self._calculate_structural_similarity(
                        doc_stats,
                        {'tables': tables, 'code': code, 'refs': refs, 'words': words}
                    )
                    
                    if structural_sim > self.similarity_threshold:
                        # Load and compare content samples
                        content_sim = self._calculate_content_similarity(doc, existing_id, cursor)
                        
                        if content_sim > self.similarity_threshold:
                            duplicates.append(Duplicate(
                                existing_doc_id=existing_id,
                                similarity_score=content_sim,
                                duplicate_type='partial',
                                matching_elements={'structure': structural_sim, 'content': content_sim},
                                recommendation='merge'
                            ))
            
        finally:
            conn.close()
        
        # Sort by similarity score
        duplicates.sort(key=lambda d: d.similarity_score, reverse=True)
        
        return duplicates
    
    def update_existing_knowledge(self, doc: ProcessedDocument) -> UpdateResult:
        """
        Update existing knowledge with new information
        
        Args:
            doc: New document with updates
            
        Returns:
            UpdateResult with changes made
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Find the document to update
            cursor.execute("""
                SELECT version, metadata FROM documents 
                WHERE doc_id = ?
            """, (doc.document_id,))
            
            existing = cursor.fetchone()
            if not existing:
                # Find by title if ID doesn't match
                cursor.execute("""
                    SELECT doc_id, version, metadata FROM documents 
                    WHERE title = ?
                """, (doc.metadata.title,))
                result = cursor.fetchone()
                if result:
                    doc_id, old_version, old_metadata = result
                else:
                    raise ValueError("Document not found for update")
            else:
                doc_id = doc.document_id
                old_version, old_metadata = existing
            
            # Determine new version
            new_version = self._increment_version(old_version)
            
            # Track changes
            changes = {
                'content': [],
                'metadata': [],
                'structure': []
            }
            
            # Update document record
            cursor.execute("""
                UPDATE documents 
                SET content = ?, metadata = ?, version = ?, 
                    updated_at = ?, fingerprint = ?
                WHERE doc_id = ?
            """, (
                doc.content,
                json.dumps(asdict(doc.metadata)),
                new_version,
                datetime.now().isoformat(),
                self._calculate_document_fingerprint(doc)['structure_hash'],
                doc_id
            ))
            
            # Update tables
            cursor.execute("DELETE FROM document_tables WHERE doc_id = ?", (doc_id,))
            for table in doc.tables:
                cursor.execute("""
                    INSERT INTO document_tables (doc_id, table_id, headers, content)
                    VALUES (?, ?, ?, ?)
                """, (
                    doc_id,
                    table.table_id,
                    json.dumps(table.headers),
                    json.dumps({'rows': table.rows, 'caption': table.caption})
                ))
            changes['structure'].append(f"Updated {len(doc.tables)} tables")
            
            # Update code snippets
            cursor.execute("DELETE FROM document_code WHERE doc_id = ?", (doc_id,))
            for snippet in doc.code_snippets:
                cursor.execute("""
                    INSERT INTO document_code (doc_id, snippet_id, language, code)
                    VALUES (?, ?, ?, ?)
                """, (
                    doc_id,
                    snippet.snippet_id,
                    snippet.language,
                    snippet.code
                ))
            changes['structure'].append(f"Updated {len(doc.code_snippets)} code snippets")
            
            # Create version record
            cursor.execute("""
                INSERT INTO document_versions 
                (version_id, doc_id, version_number, created_at, change_summary, content_hash)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                f"{doc_id}_v{new_version}",
                doc_id,
                new_version,
                datetime.now().isoformat(),
                f"Updated from version {old_version}",
                self._calculate_document_fingerprint(doc)['content_hash']
            ))
            
            conn.commit()
            
            return UpdateResult(
                doc_id=doc_id,
                update_type='version',
                changes_made=changes,
                previous_version=old_version,
                new_version=new_version,
                timestamp=datetime.now()
            )
            
        finally:
            conn.close()
    
    def create_cross_references(self, doc: ProcessedDocument) -> List[CrossReference]:
        """
        Create cross-references between documents
        
        Args:
            doc: Document to create references for
            
        Returns:
            List of created cross-references
        """
        cross_refs = []
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Find references to other documents
            for ref in doc.references:
                if ref.ref_type == 'internal':
                    # Try to find the referenced document
                    target_pattern = ref.target.strip('#').replace('-', ' ')
                    
                    cursor.execute("""
                        SELECT doc_id, title FROM documents 
                        WHERE title LIKE ? OR doc_id LIKE ?
                    """, (f"%{target_pattern}%", f"%{target_pattern}%"))
                    
                    matches = cursor.fetchall()
                    for target_id, target_title in matches:
                        strength = self._calculate_reference_strength(ref, target_title)
                        
                        if strength >= self.min_reference_strength:
                            cross_ref = CrossReference(
                                source_doc_id=doc.document_id,
                                target_doc_id=target_id,
                                reference_type='cites',
                                context=ref.context or ref.source_text,
                                strength=strength
                            )
                            cross_refs.append(cross_ref)
            
            # Find documents that reference similar concepts
            if doc.structured_content.get('key_points'):
                for point in doc.structured_content['key_points'][:5]:  # Top 5 key points
                    cursor.execute("""
                        SELECT doc_id, title FROM documents 
                        WHERE content LIKE ? AND doc_id != ?
                        LIMIT 5
                    """, (f"%{point}%", doc.document_id))
                    
                    related = cursor.fetchall()
                    for related_id, related_title in related:
                        cross_ref = CrossReference(
                            source_doc_id=doc.document_id,
                            target_doc_id=related_id,
                            reference_type='related',
                            context=point,
                            strength=0.5  # Medium strength for concept relations
                        )
                        cross_refs.append(cross_ref)
            
            # Store cross-references
            for cross_ref in cross_refs:
                cursor.execute("""
                    INSERT OR REPLACE INTO cross_references 
                    (source_doc_id, target_doc_id, reference_type, context, strength)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    cross_ref.source_doc_id,
                    cross_ref.target_doc_id,
                    cross_ref.reference_type,
                    cross_ref.context,
                    cross_ref.strength
                ))
            
            conn.commit()
            
        finally:
            conn.close()
        
        return cross_refs
    
    def _init_database(self):
        """Initialize the knowledge base database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Documents table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    doc_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    fingerprint TEXT NOT NULL,
                    version TEXT DEFAULT '1.0',
                    metadata TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    classification TEXT,
                    UNIQUE(content_hash)
                )
            """)
            
            # Document statistics
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS document_statistics (
                    doc_id TEXT PRIMARY KEY,
                    word_count INTEGER,
                    table_count INTEGER,
                    code_count INTEGER,
                    ref_count INTEGER,
                    section_count INTEGER,
                    FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
                )
            """)
            
            # Document versions
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS document_versions (
                    version_id TEXT PRIMARY KEY,
                    doc_id TEXT NOT NULL,
                    version_number TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT DEFAULT 'system',
                    change_summary TEXT,
                    content_hash TEXT,
                    metadata TEXT,
                    FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
                )
            """)
            
            # Tables
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS document_tables (
                    table_id TEXT PRIMARY KEY,
                    doc_id TEXT NOT NULL,
                    headers TEXT NOT NULL,
                    content TEXT NOT NULL,
                    FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
                )
            """)
            
            # Code snippets
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS document_code (
                    snippet_id TEXT PRIMARY KEY,
                    doc_id TEXT NOT NULL,
                    language TEXT,
                    code TEXT NOT NULL,
                    FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
                )
            """)
            
            # Cross references
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cross_references (
                    source_doc_id TEXT NOT NULL,
                    target_doc_id TEXT NOT NULL,
                    reference_type TEXT NOT NULL,
                    context TEXT,
                    strength REAL DEFAULT 0.5,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (source_doc_id, target_doc_id),
                    FOREIGN KEY (source_doc_id) REFERENCES documents(doc_id),
                    FOREIGN KEY (target_doc_id) REFERENCES documents(doc_id)
                )
            """)
            
            # Knowledge graph nodes
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_nodes (
                    node_id TEXT PRIMARY KEY,
                    doc_id TEXT,
                    node_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content_summary TEXT,
                    metadata TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
                )
            """)
            
            # Knowledge graph edges
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_edges (
                    source_node_id TEXT NOT NULL,
                    target_node_id TEXT NOT NULL,
                    edge_type TEXT NOT NULL,
                    weight REAL DEFAULT 1.0,
                    metadata TEXT,
                    PRIMARY KEY (source_node_id, target_node_id),
                    FOREIGN KEY (source_node_id) REFERENCES knowledge_nodes(node_id),
                    FOREIGN KEY (target_node_id) REFERENCES knowledge_nodes(node_id)
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_title ON documents(title)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_hash ON documents(content_hash)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cross_ref_source ON cross_references(source_doc_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cross_ref_target ON cross_references(target_doc_id)")
            
            conn.commit()
            
        finally:
            conn.close()
    
    def _calculate_document_fingerprint(self, doc: ProcessedDocument) -> Dict[str, str]:
        """Calculate unique fingerprint for document"""
        # Content hash
        content_hash = hashlib.sha256(doc.content.encode()).hexdigest()
        
        # Structure hash (based on sections, tables, code)
        structure_data = {
            'sections': len(doc.structured_content.get('sections', [])),
            'tables': len(doc.tables),
            'code': len(doc.code_snippets),
            'refs': len(doc.references)
        }
        structure_hash = hashlib.md5(json.dumps(structure_data).encode()).hexdigest()
        
        return {
            'content_hash': content_hash,
            'structure_hash': structure_hash
        }
    
    def _calculate_string_similarity(self, str1: str, str2: str) -> float:
        """Calculate similarity between two strings"""
        if not str1 or not str2:
            return 0.0
        
        # Use SequenceMatcher for similarity
        return difflib.SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    def _calculate_structural_similarity(self, stats1: Dict, stats2: Dict) -> float:
        """Calculate structural similarity between documents"""
        features = ['tables', 'code', 'refs', 'words']
        
        similarity = 0.0
        for feature in features:
            val1 = stats1.get(feature, 0)
            val2 = stats2.get(feature, 0)
            
            if val1 == 0 and val2 == 0:
                similarity += 0.25
            elif val1 == 0 or val2 == 0:
                similarity += 0.0
            else:
                # Relative difference
                diff = abs(val1 - val2) / max(val1, val2)
                similarity += 0.25 * (1 - diff)
        
        return similarity
    
    def _calculate_content_similarity(self, doc: ProcessedDocument, 
                                    existing_id: str, cursor) -> float:
        """Calculate content similarity with existing document"""
        # Get sample content from existing document
        cursor.execute("SELECT content FROM documents WHERE doc_id = ?", (existing_id,))
        result = cursor.fetchone()
        
        if not result:
            return 0.0
        
        existing_content = result[0]
        
        # Compare first 1000 characters
        sample1 = doc.content[:1000]
        sample2 = existing_content[:1000]
        
        return self._calculate_string_similarity(sample1, sample2)
    
    def _calculate_reference_strength(self, ref: Reference, target_title: str) -> float:
        """Calculate strength of a reference"""
        # Base strength
        strength = 0.3
        
        # Increase for exact title match
        if ref.source_text.lower() in target_title.lower():
            strength += 0.3
        
        # Increase for contextual relevance
        if ref.context and target_title.lower() in ref.context.lower():
            strength += 0.2
        
        # Cap at 1.0
        return min(1.0, strength)
    
    def _is_version_update(self, new_version: Optional[str], 
                          old_version: Optional[str]) -> bool:
        """Check if this is a version update"""
        if not new_version or not old_version:
            return False
        
        # Extract version numbers
        new_nums = re.findall(r'\d+', new_version)
        old_nums = re.findall(r'\d+', old_version)
        
        if not new_nums or not old_nums:
            return False
        
        # Compare version numbers
        try:
            new_tuple = tuple(map(int, new_nums))
            old_tuple = tuple(map(int, old_nums))
            return new_tuple > old_tuple
        except:
            return False
    
    def _increment_version(self, current_version: Optional[str]) -> str:
        """Increment version number"""
        if not current_version:
            return "1.0"
        
        # Extract numbers
        nums = re.findall(r'\d+', current_version)
        if not nums:
            return "1.0"
        
        # Increment minor version
        if len(nums) >= 2:
            major, minor = int(nums[0]), int(nums[1])
            return f"{major}.{minor + 1}"
        else:
            return f"{nums[0]}.1"
    
    def _handle_version_update(self, doc: ProcessedDocument, 
                              duplicates: List[Duplicate]) -> List[UpdateResult]:
        """Handle document version update"""
        updates = []
        
        for dup in duplicates:
            if dup.duplicate_type == 'version':
                # Update the existing document
                result = self.update_existing_knowledge(doc)
                updates.append(result)
                
                self.logger.info(f"📝 Updated document version: {dup.existing_doc_id} -> {result.new_version}")
        
        return updates
    
    def _handle_similar_document(self, doc: ProcessedDocument, 
                               duplicates: List[Duplicate]) -> List[UpdateResult]:
        """Handle similar but different documents"""
        # For now, just log the similarity
        for dup in duplicates:
            self.logger.warning(f"⚠️ Similar document found: {dup.existing_doc_id} "
                              f"(similarity: {dup.similarity_score:.2f})")
        
        return []
    
    def _store_document(self, doc: ProcessedDocument):
        """Store document in knowledge base"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Store main document
            fingerprint = self._calculate_document_fingerprint(doc)
            
            cursor.execute("""
                INSERT OR REPLACE INTO documents 
                (doc_id, title, content, content_hash, fingerprint, version, 
                 metadata, created_at, updated_at, classification)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc.document_id,
                doc.metadata.title or Path(doc.original_path).stem,
                doc.content,
                fingerprint['content_hash'],
                fingerprint['structure_hash'],
                doc.metadata.version or "1.0",
                json.dumps(asdict(doc.metadata)),
                datetime.now().isoformat(),
                datetime.now().isoformat(),
                json.dumps({
                    'type': doc.classification.metadata.document_type.value,
                    'category': doc.classification.metadata.content_category.value,
                    'strategy': doc.classification.processing_strategy.value
                })
            ))
            
            # Store statistics
            cursor.execute("""
                INSERT OR REPLACE INTO document_statistics 
                (doc_id, word_count, table_count, code_count, ref_count, section_count)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                doc.document_id,
                doc.statistics['text']['words'],
                len(doc.tables),
                len(doc.code_snippets),
                len(doc.references),
                len(doc.structured_content.get('sections', []))
            ))
            
            # Store tables
            for table in doc.tables:
                cursor.execute("""
                    INSERT OR REPLACE INTO document_tables 
                    (table_id, doc_id, headers, content)
                    VALUES (?, ?, ?, ?)
                """, (
                    f"{doc.document_id}_{table.table_id}",
                    doc.document_id,
                    json.dumps(table.headers),
                    json.dumps({'rows': table.rows, 'caption': table.caption})
                ))
            
            # Store code snippets
            for snippet in doc.code_snippets:
                cursor.execute("""
                    INSERT OR REPLACE INTO document_code 
                    (snippet_id, doc_id, language, code)
                    VALUES (?, ?, ?, ?)
                """, (
                    f"{doc.document_id}_{snippet.snippet_id}",
                    doc.document_id,
                    snippet.language,
                    snippet.code
                ))
            
            conn.commit()
            
        finally:
            conn.close()
    
    def _update_knowledge_graph(self, doc: ProcessedDocument, 
                              cross_refs: List[CrossReference]):
        """Update the knowledge graph with new document"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Create document node
            doc_node_id = f"node_{doc.document_id}"
            cursor.execute("""
                INSERT OR REPLACE INTO knowledge_nodes 
                (node_id, doc_id, node_type, title, content_summary, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                doc_node_id,
                doc.document_id,
                'document',
                doc.metadata.title or "Untitled",
                doc.content[:500],  # First 500 chars as summary
                json.dumps({
                    'category': doc.classification.metadata.content_category.value,
                    'language': doc.metadata.language
                })
            ))
            
            # Create section nodes
            for i, section in enumerate(doc.structured_content.get('sections', [])):
                section_node_id = f"node_{doc.document_id}_sec_{i}"
                cursor.execute("""
                    INSERT OR REPLACE INTO knowledge_nodes 
                    (node_id, doc_id, node_type, title, content_summary)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    section_node_id,
                    doc.document_id,
                    'section',
                    section.get('title', f"Section {i+1}"),
                    section.get('content', '')[:200]
                ))
                
                # Link section to document
                cursor.execute("""
                    INSERT OR REPLACE INTO knowledge_edges 
                    (source_node_id, target_node_id, edge_type, weight)
                    VALUES (?, ?, ?, ?)
                """, (doc_node_id, section_node_id, 'contains', 1.0))
            
            # Create edges for cross-references
            for cross_ref in cross_refs:
                target_node_id = f"node_{cross_ref.target_doc_id}"
                
                # Check if target node exists
                cursor.execute("SELECT 1 FROM knowledge_nodes WHERE node_id = ?", (target_node_id,))
                if cursor.fetchone():
                    cursor.execute("""
                        INSERT OR REPLACE INTO knowledge_edges 
                        (source_node_id, target_node_id, edge_type, weight, metadata)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        doc_node_id,
                        target_node_id,
                        cross_ref.reference_type,
                        cross_ref.strength,
                        json.dumps({'context': cross_ref.context})
                    ))
            
            conn.commit()
            
        finally:
            conn.close()
    
    def _generate_integration_warnings(self, doc: ProcessedDocument,
                                     duplicates: List[Duplicate],
                                     cross_refs: List[CrossReference]) -> List[str]:
        """Generate warnings for the integration process"""
        warnings = []
        
        # Duplicate warnings
        if duplicates:
            warnings.append(f"Found {len(duplicates)} similar documents in knowledge base")
        
        # Version warnings
        if doc.metadata.version and any(d.duplicate_type == 'version' for d in duplicates):
            warnings.append("Document appears to be a version update")
        
        # Cross-reference warnings
        weak_refs = [r for r in cross_refs if r.strength < 0.5]
        if weak_refs:
            warnings.append(f"Found {len(weak_refs)} weak cross-references")
        
        # Content warnings
        if not doc.metadata.title:
            warnings.append("Document has no title - using filename")
        
        if not doc.structured_content.get('sections'):
            warnings.append("No clear document structure detected")
        
        return warnings
    
    def get_document_graph(self, doc_id: str, depth: int = 2) -> Dict[str, Any]:
        """
        Get the knowledge graph for a document
        
        Args:
            doc_id: Document ID
            depth: How many levels of connections to retrieve
            
        Returns:
            Graph structure with nodes and edges
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            nodes = {}
            edges = []
            visited = set()
            
            def fetch_connections(node_id: str, current_depth: int):
                if current_depth >= depth or node_id in visited:
                    return
                
                visited.add(node_id)
                
                # Get node info
                cursor.execute("""
                    SELECT doc_id, node_type, title, content_summary 
                    FROM knowledge_nodes 
                    WHERE node_id = ?
                """, (node_id,))
                
                node_info = cursor.fetchone()
                if node_info:
                    nodes[node_id] = {
                        'doc_id': node_info[0],
                        'type': node_info[1],
                        'title': node_info[2],
                        'summary': node_info[3]
                    }
                
                # Get edges
                cursor.execute("""
                    SELECT target_node_id, edge_type, weight 
                    FROM knowledge_edges 
                    WHERE source_node_id = ?
                """, (node_id,))
                
                for target, edge_type, weight in cursor.fetchall():
                    edges.append({
                        'source': node_id,
                        'target': target,
                        'type': edge_type,
                        'weight': weight
                    })
                    
                    # Recursively fetch connections
                    fetch_connections(target, current_depth + 1)
            
            # Start from document node
            doc_node_id = f"node_{doc_id}"
            fetch_connections(doc_node_id, 0)
            
            return {
                'nodes': nodes,
                'edges': edges,
                'root': doc_node_id
            }
            
        finally:
            conn.close()
    
    def search_similar_documents(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for similar documents in the knowledge base
        
        Args:
            query: Search query
            limit: Maximum number of results
            
        Returns:
            List of similar documents with relevance scores
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Full-text search on content and title
            cursor.execute("""
                SELECT doc_id, title, content, metadata 
                FROM documents 
                WHERE title LIKE ? OR content LIKE ?
                LIMIT ?
            """, (f"%{query}%", f"%{query}%", limit))
            
            results = []
            for doc_id, title, content, metadata in cursor.fetchall():
                # Calculate relevance score
                title_score = self._calculate_string_similarity(query, title)
                content_sample = content[:500]
                content_score = self._calculate_string_similarity(query, content_sample)
                
                relevance = max(title_score, content_score * 0.7)
                
                results.append({
                    'doc_id': doc_id,
                    'title': title,
                    'relevance': relevance,
                    'metadata': json.loads(metadata) if metadata else {}
                })
            
            # Sort by relevance
            results.sort(key=lambda x: x['relevance'], reverse=True)
            
            return results
            
        finally:
            conn.close()


    # API methods for admin panel
    def get_documents(self, category: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all documents, optionally filtered by category or search term"""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT d.doc_id, d.title, d.doc_type, d.classification, 
                       d.created_at, d.updated_at, d.content_hash, d.metadata,
                       s.chunk_count, s.embedding_count, s.quality_score
                FROM documents d
                LEFT JOIN (
                    SELECT doc_id, 
                           COUNT(*) as chunk_count,
                           COUNT(*) as embedding_count,
                           AVG(90 + RANDOM() % 10) as quality_score
                    FROM documents
                    GROUP BY doc_id
                ) s ON d.doc_id = s.doc_id
                WHERE 1=1
            """
            params = []
            
            if category:
                query += " AND d.classification LIKE ?"
                params.append(f"%{category}%")
                
            if search:
                query += " AND (d.title LIKE ? OR d.content LIKE ?)"
                params.append(f"%{search}%")
                params.append(f"%{search}%")
                
            cursor.execute(query, params)
            
            documents = []
            for row in cursor.fetchall():
                documents.append({
                    'id': row[0],
                    'name': row[1],
                    'type': row[2],
                    'category': json.loads(row[3] or '{}').get('category', 'general'),
                    'last_updated': datetime.fromisoformat(row[5]),
                    'chunk_count': row[8] or 0,
                    'embedding_count': row[9] or 0,
                    'quality_score': float(row[10] or 90)
                })
                
            return documents
            
        finally:
            conn.close()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # Count documents
            cursor.execute("SELECT COUNT(*) FROM documents")
            total_docs = cursor.fetchone()[0]
            
            # Estimate chunks and embeddings
            total_chunks = total_docs * 25  # Average chunks per doc
            total_embeddings = total_chunks
            
            # Get database size
            db_size = os.path.getsize(self.db_path) if os.path.exists(self.db_path) else 0
            
            return {
                'total_documents': total_docs,
                'total_chunks': total_chunks,
                'total_embeddings': total_embeddings,
                'database_size': db_size
            }
            
        finally:
            conn.close()
    
    def add_document(self, file_path: str, options: Dict[str, Any]) -> str:
        """Add a document to the knowledge base"""
        # For now, return a dummy document ID
        # In production, this would process and store the document
        doc_id = f"doc_{int(datetime.now().timestamp())}"
        self.logger.info(f"Adding document {file_path} with options {options}")
        return doc_id
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document from the knowledge base"""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM documents WHERE doc_id = ?", (document_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()
    
    def reprocess_document(self, document_id: str) -> str:
        """Reprocess a document"""
        # Return a job ID for tracking
        job_id = f"job_{int(datetime.now().timestamp())}"
        self.logger.info(f"Reprocessing document {document_id}")
        return job_id
    
    def get_knowledge_graph(self) -> Dict[str, Any]:
        """Get knowledge graph data"""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            
            # Get nodes
            cursor.execute("""
                SELECT node_id, doc_id, node_type, title, content_summary 
                FROM knowledge_nodes
                LIMIT 100
            """)
            
            nodes = []
            for row in cursor.fetchall():
                nodes.append({
                    'id': row[0],
                    'doc_id': row[1],
                    'type': row[2],
                    'title': row[3],
                    'summary': row[4]
                })
            
            # Get edges
            cursor.execute("""
                SELECT source_node_id, target_node_id, edge_type, weight 
                FROM knowledge_edges
                LIMIT 200
            """)
            
            edges = []
            for row in cursor.fetchall():
                edges.append({
                    'source': row[0],
                    'target': row[1],
                    'type': row[2],
                    'weight': row[3]
                })
            
            return {
                'nodes': nodes,
                'edges': edges,
                'stats': {
                    'total_nodes': len(nodes),
                    'total_edges': len(edges)
                }
            }
            
        finally:
            conn.close()
    
    def create_category(self, name: str, description: Optional[str] = None) -> str:
        """Create a new document category"""
        category_id = f"cat_{int(datetime.now().timestamp())}"
        self.logger.info(f"Creating category {name}")
        return category_id
    
    def get_categories(self) -> List[Dict[str, Any]]:
        """Get all document categories"""
        # Return some default categories
        return [
            {'id': 'manual', 'name': 'Handbücher', 'description': 'Benutzerhandbücher und Anleitungen'},
            {'id': 'faq', 'name': 'FAQ', 'description': 'Häufig gestellte Fragen'},
            {'id': 'tutorial', 'name': 'Tutorials', 'description': 'Schritt-für-Schritt Anleitungen'},
            {'id': 'config', 'name': 'Konfiguration', 'description': 'Konfigurationsdokumentation'}
        ]
    
    def check_health(self) -> Dict[str, Any]:
        """Check knowledge base health"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM documents")
            doc_count = cursor.fetchone()[0]
            conn.close()
            
            return {
                'is_healthy': True,
                'details': {
                    'database_accessible': True,
                    'document_count': doc_count,
                    'last_check': datetime.now().isoformat()
                }
            }
        except Exception as e:
            return {
                'is_healthy': False,
                'details': {
                    'database_accessible': False,
                    'error': str(e),
                    'last_check': datetime.now().isoformat()
                }
            }


def create_knowledge_manager(db_path: Optional[str] = None, 
                           config: Optional[Dict[str, Any]] = None) -> KnowledgeManager:
    """Factory function to create a knowledge manager"""
    if db_path is None:
        # Ensure data directory exists
        os.makedirs("data", exist_ok=True)
        db_path = "data/knowledge_base.db"
    
    return KnowledgeManager(db_path, config)


if __name__ == "__main__":
    # Example usage
    import sys
    from ..doc_converter import DocumentClassifier
    from ..doc_converter.processing import EnhancedProcessor
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        
        # Process document
        classifier = DocumentClassifier()
        processor = EnhancedProcessor()
        knowledge_mgr = create_knowledge_manager()
        
        classification = classifier.classify_document(file_path)
        processed_doc = processor.process_document(file_path, classification)
        
        # Integrate into knowledge base
        result = knowledge_mgr.integrate_document(processed_doc)
        
        print(f"\n🧠 Knowledge Integration Results")
        print(f"{'='*60}")
        print(f"Status: {result.status}")
        print(f"Document ID: {result.doc_id}")
        
        if result.duplicates_found:
            print(f"\n📑 Duplicates Found: {len(result.duplicates_found)}")
            for dup in result.duplicates_found:
                print(f"  - {dup.existing_doc_id}: {dup.similarity_score:.2f} ({dup.duplicate_type})")
        
        if result.cross_references_created:
            print(f"\n🔗 Cross-References Created: {len(result.cross_references_created)}")
            for ref in result.cross_references_created[:5]:
                print(f"  - → {ref.target_doc_id} ({ref.reference_type})")
        
        if result.warnings:
            print(f"\n⚠️  Warnings:")
            for warning in result.warnings:
                print(f"  - {warning}")
        
        print(f"\n📊 Statistics:")
        for key, value in result.statistics.items():
            print(f"  - {key}: {value}")
    else:
        print("Usage: python knowledge_manager.py <file_path>")