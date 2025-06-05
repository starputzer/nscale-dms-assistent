"""
Document Converter Database Module
Handles persistent storage for document conversion queue and history
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

from ..core.config import Config

logger = logging.getLogger(__name__)

class DocumentConverterDB:
    """Database handler for document converter"""
    
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            db_path = str(Config.BASE_DIR / 'data' / 'db' / 'doc_converter.db')
        
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
    
    def _init_database(self):
        """Initialize database tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Conversion queue table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversion_queue (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    filepath TEXT NOT NULL,
                    file_type TEXT,
                    file_size INTEGER,
                    status TEXT DEFAULT 'pending',
                    progress INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    user_id INTEGER,
                    error TEXT,
                    priority INTEGER DEFAULT 5
                )
            """)
            
            # Conversion history table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversion_history (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    filepath TEXT NOT NULL,
                    file_type TEXT,
                    file_size INTEGER,
                    status TEXT,
                    processing_time REAL,
                    created_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    user_id INTEGER,
                    error TEXT,
                    result TEXT,  -- JSON string
                    metadata TEXT  -- JSON string
                )
            """)
            
            # Processing statistics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS processing_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE DEFAULT CURRENT_DATE,
                    total_processed INTEGER DEFAULT 0,
                    successful INTEGER DEFAULT 0,
                    failed INTEGER DEFAULT 0,
                    avg_processing_time REAL DEFAULT 0,
                    by_type TEXT,  -- JSON string
                    by_category TEXT,  -- JSON string
                    by_strategy TEXT  -- JSON string
                )
            """)
            
            # Document metadata table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS document_metadata (
                    doc_id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    file_type TEXT,
                    file_size INTEGER,
                    file_hash TEXT,
                    content_hash TEXT,
                    category TEXT,
                    classification TEXT,  -- JSON string
                    processing_strategy TEXT,
                    confidence_score REAL,
                    language TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    chunks_count INTEGER,
                    doc_store_id TEXT
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_queue_status ON conversion_queue(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_queue_created ON conversion_queue(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_status ON conversion_history(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_completed ON conversion_history(completed_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_category ON document_metadata(category)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_type ON document_metadata(file_type)")
            
            conn.commit()
    
    # Queue operations
    def add_to_queue(self, item: Dict[str, Any]) -> bool:
        """Add item to conversion queue"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO conversion_queue 
                    (id, filename, filepath, file_type, file_size, status, user_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item['id'],
                    item['filename'],
                    item['path'],
                    item.get('type', ''),
                    item.get('size', 0),
                    item.get('status', 'pending'),
                    item.get('user_id'),
                    item.get('created_at', datetime.now().isoformat())
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error adding to queue: {e}")
            return False
    
    def get_queue_items(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get items from queue"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                if status:
                    cursor.execute("""
                        SELECT * FROM conversion_queue 
                        WHERE status = ? 
                        ORDER BY priority DESC, created_at ASC
                    """, (status,))
                else:
                    cursor.execute("""
                        SELECT * FROM conversion_queue 
                        ORDER BY priority DESC, created_at ASC
                    """)
                
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting queue items: {e}")
            return []
    
    def update_queue_item(self, item_id: str, updates: Dict[str, Any]) -> bool:
        """Update queue item"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Build update query
                set_clauses = []
                values = []
                for key, value in updates.items():
                    set_clauses.append(f"{key} = ?")
                    values.append(value)
                
                values.append(item_id)
                
                cursor.execute(f"""
                    UPDATE conversion_queue 
                    SET {', '.join(set_clauses)}
                    WHERE id = ?
                """, values)
                
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error updating queue item: {e}")
            return False
    
    def remove_from_queue(self, item_id: str) -> bool:
        """Remove item from queue"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM conversion_queue WHERE id = ?", (item_id,))
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error removing from queue: {e}")
            return False
    
    # History operations
    def add_to_history(self, item: Dict[str, Any]) -> bool:
        """Add completed conversion to history"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO conversion_history 
                    (id, filename, filepath, file_type, file_size, status, 
                     processing_time, created_at, completed_at, user_id, error, result, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item['id'],
                    item['filename'],
                    item.get('filepath', item.get('path', '')),  # Support both 'filepath' and 'path'
                    item.get('file_type', item.get('type', '')),  # Support both 'file_type' and 'type'
                    item.get('file_size', item.get('size', 0)),  # Support both 'file_size' and 'size'
                    item['status'],
                    item.get('processing_time', 0),
                    item.get('created_at'),
                    item.get('completed_at'),
                    item.get('user_id'),
                    item.get('error'),
                    json.dumps(item.get('result', {})),
                    json.dumps(item.get('metadata', {}))
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error adding to history: {e}")
            return False
    
    def get_recent_conversions(self, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """Get recent conversions from history"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT * FROM conversion_history 
                    ORDER BY completed_at DESC 
                    LIMIT ? OFFSET ?
                """, (limit, offset))
                
                rows = cursor.fetchall()
                results = []
                for row in rows:
                    item = dict(row)
                    # Parse JSON fields
                    if item.get('result'):
                        item['result'] = json.loads(item['result'])
                    if item.get('metadata'):
                        item['metadata'] = json.loads(item['metadata'])
                    results.append(item)
                
                return results
        except Exception as e:
            logger.error(f"Error getting recent conversions: {e}")
            return []
    
    # Statistics operations
    def update_statistics(self, stats: Dict[str, Any]):
        """Update processing statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if today's stats exist
                today = datetime.now().date()
                cursor.execute("SELECT id FROM processing_stats WHERE date = ?", (today,))
                row = cursor.fetchone()
                
                if row:
                    # Update existing
                    cursor.execute("""
                        UPDATE processing_stats 
                        SET total_processed = ?, successful = ?, failed = ?, 
                            avg_processing_time = ?, by_type = ?, by_category = ?, by_strategy = ?
                        WHERE date = ?
                    """, (
                        stats.get('total_processed', 0),
                        stats.get('successful', 0),
                        stats.get('failed', 0),
                        stats.get('avg_processing_time', 0),
                        json.dumps(stats.get('by_type', {})),
                        json.dumps(stats.get('by_category', {})),
                        json.dumps(stats.get('by_strategy', {})),
                        today
                    ))
                else:
                    # Insert new
                    cursor.execute("""
                        INSERT INTO processing_stats 
                        (date, total_processed, successful, failed, avg_processing_time, 
                         by_type, by_category, by_strategy)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        today,
                        stats.get('total_processed', 0),
                        stats.get('successful', 0),
                        stats.get('failed', 0),
                        stats.get('avg_processing_time', 0),
                        json.dumps(stats.get('by_type', {})),
                        json.dumps(stats.get('by_category', {})),
                        json.dumps(stats.get('by_strategy', {}))
                    ))
                
                conn.commit()
        except Exception as e:
            logger.error(f"Error updating statistics: {e}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get overall statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get totals from history
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                        AVG(CASE WHEN status = 'completed' THEN processing_time ELSE NULL END) as avg_time
                    FROM conversion_history
                """)
                
                row = cursor.fetchone()
                if row:
                    return {
                        'total_processed': row[0] or 0,
                        'successful': row[1] or 0,
                        'failed': row[2] or 0,
                        'avg_processing_time': round(row[3] or 0, 2)
                    }
                
                return {
                    'total_processed': 0,
                    'successful': 0,
                    'failed': 0,
                    'avg_processing_time': 0
                }
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {
                'total_processed': 0,
                'successful': 0,
                'failed': 0,
                'avg_processing_time': 0
            }
    
    # Document metadata operations
    def save_document_metadata(self, metadata: Dict[str, Any]) -> bool:
        """Save document metadata"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO document_metadata 
                    (doc_id, filename, file_type, file_size, file_hash, content_hash,
                     category, classification, processing_strategy, confidence_score,
                     language, chunks_count, doc_store_id, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    metadata['doc_id'],
                    metadata['filename'],
                    metadata.get('file_type'),
                    metadata.get('file_size'),
                    metadata.get('file_hash'),
                    metadata.get('content_hash'),
                    metadata.get('category'),
                    json.dumps(metadata.get('classification', {})),
                    metadata.get('processing_strategy'),
                    metadata.get('confidence_score'),
                    metadata.get('language'),
                    metadata.get('chunks_count'),
                    metadata.get('doc_store_id'),
                    datetime.now().isoformat()
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error saving document metadata: {e}")
            return False
    
    def get_classification_data(self) -> Dict[str, Any]:
        """Get document classification statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Document types
                cursor.execute("""
                    SELECT file_type, COUNT(*) as count 
                    FROM document_metadata 
                    GROUP BY file_type
                """)
                document_types = {row[0]: row[1] for row in cursor.fetchall() if row[0]}
                
                # Categories
                cursor.execute("""
                    SELECT category, COUNT(*) as count 
                    FROM document_metadata 
                    GROUP BY category
                """)
                categories = {}
                for row in cursor.fetchall():
                    if row[0]:
                        categories[row[0]] = {
                            'documents': row[1],
                            'priority': 'medium',
                            'successRate': 95,
                            'description': f'{row[0].title()} documents'
                        }
                
                # Processing strategies
                cursor.execute("""
                    SELECT processing_strategy, COUNT(*) as count, 
                           AVG(chunks_count) as avg_chunks
                    FROM document_metadata 
                    WHERE processing_strategy IS NOT NULL
                    GROUP BY processing_strategy
                """)
                strategies = {}
                for row in cursor.fetchall():
                    strategies[row[0]] = {
                        'name': row[0].replace('_', ' ').title(),
                        'documentsProcessed': row[1],
                        'avgChunks': round(row[2] or 0, 1),
                        'features': []
                    }
                
                return {
                    'documentTypes': document_types,
                    'contentCategories': categories,
                    'processingStrategies': strategies
                }
        except Exception as e:
            logger.error(f"Error getting classification data: {e}")
            return {
                'documentTypes': {},
                'contentCategories': {},
                'processingStrategies': {}
            }

# Singleton instance
_db_instance = None

def get_db() -> DocumentConverterDB:
    """Get or create database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DocumentConverterDB()
    return _db_instance