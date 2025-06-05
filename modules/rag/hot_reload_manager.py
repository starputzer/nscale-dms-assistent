"""
Hot Reload Manager for RAG System
Enables dynamic document loading without server restart
"""

import os
import time
import threading
from pathlib import Path
from typing import Dict, List, Set, Optional, Callable
from datetime import datetime
import hashlib
import json

from ..core.logging import LogManager
from ..core.config import Config
from .optimized_rag_engine import OptimizedRAGEngine
from ..background.processor import BackgroundProcessor, ProcessingPriority

logger = LogManager.setup_logging(__name__)


class HotReloadManager:
    """Manages hot reloading of documents in the RAG system"""
    
    def __init__(self, rag_engine: OptimizedRAGEngine, background_processor: BackgroundProcessor):
        self.rag_engine = rag_engine
        self.background_processor = background_processor
        self.watch_directories: List[Path] = []
        self.file_hashes: Dict[str, str] = {}
        self.is_watching = False
        self.watch_thread: Optional[threading.Thread] = None
        self.scan_interval = 10  # seconds
        self.callbacks: List[Callable] = []
        
        # Load existing file hashes
        self._load_file_hashes()
        
    def add_watch_directory(self, directory: Path):
        """Add a directory to watch for changes"""
        if directory.exists() and directory.is_dir():
            self.watch_directories.append(directory)
            logger.info(f"Added watch directory: {directory}")
        else:
            logger.warning(f"Directory does not exist or is not a directory: {directory}")
            
    def add_callback(self, callback: Callable):
        """Add a callback to be called when documents are reloaded"""
        self.callbacks.append(callback)
        
    def start_watching(self):
        """Start watching for file changes"""
        if self.is_watching:
            logger.warning("Hot reload manager is already watching")
            return
            
        self.is_watching = True
        self.watch_thread = threading.Thread(target=self._watch_loop, daemon=True)
        self.watch_thread.start()
        logger.info("Hot reload manager started")
        
    def stop_watching(self):
        """Stop watching for file changes"""
        self.is_watching = False
        if self.watch_thread:
            self.watch_thread.join(timeout=5)
            self.watch_thread = None
        logger.info("Hot reload manager stopped")
        
    def _watch_loop(self):
        """Main watch loop that checks for file changes"""
        while self.is_watching:
            try:
                changes = self._scan_for_changes()
                
                if changes['new'] or changes['modified'] or changes['deleted']:
                    logger.info(f"Detected changes - New: {len(changes['new'])}, "
                              f"Modified: {len(changes['modified'])}, "
                              f"Deleted: {len(changes['deleted'])}")
                    
                    self._process_changes(changes)
                    
            except Exception as e:
                logger.error(f"Error in watch loop: {str(e)}")
                
            # Sleep for the scan interval
            time.sleep(self.scan_interval)
            
    def _scan_for_changes(self) -> Dict[str, List[Path]]:
        """Scan watched directories for changes"""
        changes = {
            'new': [],
            'modified': [],
            'deleted': []
        }
        
        current_files = {}
        
        # Scan all watched directories
        for directory in self.watch_directories:
            if not directory.exists():
                continue
                
            # Find all documents in directory
            for file_path in self._find_documents(directory):
                file_hash = self._calculate_file_hash(file_path)
                current_files[str(file_path)] = file_hash
                
                # Check if file is new or modified
                if str(file_path) not in self.file_hashes:
                    changes['new'].append(file_path)
                elif self.file_hashes[str(file_path)] != file_hash:
                    changes['modified'].append(file_path)
                    
        # Check for deleted files
        for file_path in self.file_hashes:
            if file_path not in current_files:
                changes['deleted'].append(Path(file_path))
                
        return changes
        
    def _find_documents(self, directory: Path) -> List[Path]:
        """Find all document files in a directory"""
        supported_extensions = {'.pdf', '.docx', '.doc', '.txt', '.html', '.htm', '.md', '.rtf'}
        documents = []
        
        for file_path in directory.rglob('*'):
            if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
                # Skip hidden files and temporary files
                if not file_path.name.startswith('.') and not file_path.name.startswith('~'):
                    documents.append(file_path)
                    
        return documents
        
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate hash of a file for change detection"""
        hasher = hashlib.md5()
        
        # Include file size and modification time for quick change detection
        stat = file_path.stat()
        hasher.update(f"{stat.st_size}:{stat.st_mtime}".encode())
        
        # For small files, include content hash
        if stat.st_size < 1024 * 1024:  # 1MB
            with open(file_path, 'rb') as f:
                hasher.update(f.read())
                
        return hasher.hexdigest()
        
    def _process_changes(self, changes: Dict[str, List[Path]]):
        """Process detected file changes"""
        
        # Process deleted files first
        for file_path in changes['deleted']:
            self._handle_deleted_file(file_path)
            
        # Process new files
        for file_path in changes['new']:
            self._handle_new_file(file_path)
            
        # Process modified files
        for file_path in changes['modified']:
            self._handle_modified_file(file_path)
            
        # Update file hashes
        self._update_file_hashes()
        
        # Trigger callbacks
        self._trigger_callbacks(changes)
        
    def _handle_new_file(self, file_path: Path):
        """Handle a new document file"""
        try:
            logger.info(f"Processing new document: {file_path}")
            
            # Generate document ID based on file path
            doc_id = self._generate_document_id(file_path)
            
            # Submit for background processing
            job_id = self.background_processor.submit_job(
                str(file_path),
                ProcessingPriority.HIGH,
                metadata={
                    'document_id': doc_id,
                    'hot_reload': True,
                    'action': 'add'
                }
            )
            
            logger.info(f"Submitted new document for processing: {doc_id} (Job: {job_id})")
            
        except Exception as e:
            logger.error(f"Error handling new file {file_path}: {str(e)}")
            
    def _handle_modified_file(self, file_path: Path):
        """Handle a modified document file"""
        try:
            logger.info(f"Processing modified document: {file_path}")
            
            # Generate document ID based on file path
            doc_id = self._generate_document_id(file_path)
            
            # Remove old version from index
            self.rag_engine.remove_document(doc_id)
            
            # Submit for reprocessing
            job_id = self.background_processor.submit_job(
                str(file_path),
                ProcessingPriority.NORMAL,
                metadata={
                    'document_id': doc_id,
                    'hot_reload': True,
                    'action': 'update'
                }
            )
            
            logger.info(f"Submitted modified document for reprocessing: {doc_id} (Job: {job_id})")
            
        except Exception as e:
            logger.error(f"Error handling modified file {file_path}: {str(e)}")
            
    def _handle_deleted_file(self, file_path: Path):
        """Handle a deleted document file"""
        try:
            logger.info(f"Processing deleted document: {file_path}")
            
            # Generate document ID based on file path
            doc_id = self._generate_document_id(file_path)
            
            # Remove from index
            self.rag_engine.remove_document(doc_id)
            
            # Remove from file hashes
            if str(file_path) in self.file_hashes:
                del self.file_hashes[str(file_path)]
                
            logger.info(f"Removed deleted document from index: {doc_id}")
            
        except Exception as e:
            logger.error(f"Error handling deleted file {file_path}: {str(e)}")
            
    def _generate_document_id(self, file_path: Path) -> str:
        """Generate a consistent document ID from file path"""
        # Use relative path from watch directories for consistency
        relative_path = None
        for watch_dir in self.watch_directories:
            try:
                relative_path = file_path.relative_to(watch_dir)
                break
            except ValueError:
                continue
                
        if relative_path:
            # Use relative path as ID (with normalized separators)
            return str(relative_path).replace(os.sep, '/')
        else:
            # Fallback to absolute path hash
            return hashlib.md5(str(file_path).encode()).hexdigest()
            
    def _update_file_hashes(self):
        """Update the stored file hashes"""
        # Recalculate all hashes
        new_hashes = {}
        
        for directory in self.watch_directories:
            if not directory.exists():
                continue
                
            for file_path in self._find_documents(directory):
                file_hash = self._calculate_file_hash(file_path)
                new_hashes[str(file_path)] = file_hash
                
        self.file_hashes = new_hashes
        self._save_file_hashes()
        
    def _load_file_hashes(self):
        """Load stored file hashes from disk"""
        hash_file = Config.APP_DIR / "data" / "hot_reload_hashes.json"
        
        if hash_file.exists():
            try:
                with open(hash_file, 'r') as f:
                    self.file_hashes = json.load(f)
                logger.info(f"Loaded {len(self.file_hashes)} file hashes")
            except Exception as e:
                logger.error(f"Error loading file hashes: {str(e)}")
                self.file_hashes = {}
        else:
            self.file_hashes = {}
            
    def _save_file_hashes(self):
        """Save file hashes to disk"""
        hash_file = Config.APP_DIR / "data" / "hot_reload_hashes.json"
        hash_file.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(hash_file, 'w') as f:
                json.dump(self.file_hashes, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving file hashes: {str(e)}")
            
    def _trigger_callbacks(self, changes: Dict[str, List[Path]]):
        """Trigger registered callbacks"""
        for callback in self.callbacks:
            try:
                callback(changes)
            except Exception as e:
                logger.error(f"Error in hot reload callback: {str(e)}")
                
    def force_reload_all(self):
        """Force reload all documents in watched directories"""
        logger.info("Forcing reload of all documents")
        
        for directory in self.watch_directories:
            if not directory.exists():
                continue
                
            for file_path in self._find_documents(directory):
                self._handle_new_file(file_path)
                
        self._update_file_hashes()
        
    def get_status(self) -> Dict[str, any]:
        """Get current status of hot reload manager"""
        return {
            'is_watching': self.is_watching,
            'watch_directories': [str(d) for d in self.watch_directories],
            'tracked_files': len(self.file_hashes),
            'scan_interval': self.scan_interval
        }


# Global instance
_hot_reload_manager: Optional[HotReloadManager] = None


def get_hot_reload_manager() -> HotReloadManager:
    """Get or create the global hot reload manager instance"""
    global _hot_reload_manager
    
    if _hot_reload_manager is None:
        # Initialize with default components
        from .optimized_rag_engine import OptimizedRAGEngine
        from ..background.processor import BackgroundProcessor
        
        rag_engine = OptimizedRAGEngine()
        background_processor = BackgroundProcessor()
        
        _hot_reload_manager = HotReloadManager(rag_engine, background_processor)
        
        # Add default watch directories
        uploads_dir = Config.APP_DIR / "data" / "uploads"
        documents_dir = Config.APP_DIR / "data" / "documents"
        
        _hot_reload_manager.add_watch_directory(uploads_dir)
        _hot_reload_manager.add_watch_directory(documents_dir)
        
        # Start watching
        _hot_reload_manager.start_watching()
        
    return _hot_reload_manager