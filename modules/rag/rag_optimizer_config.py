"""
RAG Optimizer Configuration
Zentrale Konfiguration für alle Optimierungs-Parameter
"""
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
import os
import json
from pathlib import Path


@dataclass
class ChunkingConfig:
    """Konfiguration für Semantic Chunking"""
    min_chunk_size: int = 200
    target_chunk_size: int = 600
    max_chunk_size: int = 1000
    overlap_ratio: float = 0.15
    
    # Strategie-spezifische Parameter
    sentence_boundary_respect: bool = True
    paragraph_boundary_weight: float = 2.0
    section_boundary_weight: float = 3.0
    
    # Qualitäts-Thresholds
    min_coherence_score: float = 0.6
    deduplication_threshold: float = 0.95
    
    # Performance
    batch_size: int = 100
    max_threads: int = 4


@dataclass
class EmbeddingConfig:
    """Konfiguration für Embeddings"""
    model_name: str = "BAAI/bge-m3"
    fallback_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    
    # Gerät-Einstellungen
    device: str = "cuda"  # "cuda", "cpu", "auto"
    fp16: bool = True
    
    # Batch-Processing
    batch_size: int = 32
    max_sequence_length: int = 512
    normalize_embeddings: bool = True
    
    # Caching
    cache_enabled: bool = True
    cache_dir: str = "cache/embeddings"
    cache_ttl: int = 86400  # 24 Stunden


@dataclass
class RetrievalConfig:
    """Konfiguration für Hybrid Retrieval"""
    # Dense Search (Semantic)
    dense_weight: float = 0.6
    dense_top_k: int = 20
    faiss_index_type: str = "Flat"  # "Flat", "IVF", "HNSW"
    faiss_nprobe: int = 10  # Für IVF
    
    # Sparse Search (Keyword)
    sparse_weight: float = 0.4
    sparse_top_k: int = 20
    bm25_k1: float = 1.2
    bm25_b: float = 0.75
    
    # Reranking
    use_reranking: bool = True
    reranker_model: str = "BAAI/bge-reranker-base"
    rerank_top_k: int = 10
    
    # Final Results
    final_top_k: int = 5
    min_score_threshold: float = 0.0


@dataclass
class CacheConfig:
    """Konfiguration für Caching"""
    backend: str = "redis"  # "redis", "memory", "disk"
    
    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    
    # Memory Cache
    max_memory_mb: int = 500
    eviction_policy: str = "lru"  # "lru", "lfu", "fifo"
    
    # TTL Settings
    default_ttl: int = 3600  # 1 Stunde
    embedding_ttl: int = 86400  # 24 Stunden
    search_result_ttl: int = 1800  # 30 Minuten
    
    # Cache Keys
    key_prefix: str = "rag:"
    
    # Performance
    compression_enabled: bool = True
    async_writes: bool = True


@dataclass
class PerformanceConfig:
    """Konfiguration für Performance-Optimierung"""
    # Batch Processing
    batch_processor_enabled: bool = True
    default_batch_size: int = 32
    max_batch_wait_time: float = 0.5  # Sekunden
    max_queue_size: int = 1000
    
    # Parallel Processing
    max_workers: int = 4
    thread_pool_size: int = 8
    
    # Monitoring
    monitoring_enabled: bool = True
    metrics_window_size: int = 1000
    alert_threshold: float = 2.0  # x-fache der normalen Latenz
    
    # Resource Limits
    max_memory_usage_mb: int = 2048
    max_gpu_memory_ratio: float = 0.8
    
    # Timeouts
    embedding_timeout: int = 30  # Sekunden
    search_timeout: int = 10
    rerank_timeout: int = 5


@dataclass
class QualityConfig:
    """Konfiguration für Qualitätsbewertung"""
    # Document Quality
    min_readability_score: float = 30.0
    min_structure_score: float = 0.5
    min_completeness_score: float = 0.7
    
    # Chunk Quality
    min_chunk_coherence: float = 0.6
    min_chunk_quality: float = 0.5
    
    # Language Detection
    primary_language: str = "de"
    fallback_languages: List[str] = field(default_factory=lambda: ["en"])
    min_language_confidence: float = 0.8


@dataclass
class DocumentProcessingConfig:
    """Konfiguration für Document Processing"""
    # Verzeichnisse
    source_dir: str = "data/raw_docs"
    converted_dir: str = "data/converted"
    index_dir: str = "cache/document_index"
    
    # File Watching
    watch_enabled: bool = True
    watch_patterns: List[str] = field(default_factory=lambda: ["*.pdf", "*.docx", "*.txt", "*.md"])
    
    # Unterstützte Formate
    supported_formats: List[str] = field(default_factory=lambda: [
        ".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".md", ".html"
    ])
    
    # Processing
    force_reprocess: bool = False
    delete_after_conversion: bool = False
    preserve_structure: bool = True
    
    # Limits
    max_file_size_mb: int = 100
    max_processing_time: int = 300  # Sekunden


@dataclass
class RAGOptimizerConfig:
    """Haupt-Konfiguration für RAG Optimizer"""
    # Sub-Konfigurationen
    chunking: ChunkingConfig = field(default_factory=ChunkingConfig)
    embedding: EmbeddingConfig = field(default_factory=EmbeddingConfig)
    retrieval: RetrievalConfig = field(default_factory=RetrievalConfig)
    cache: CacheConfig = field(default_factory=CacheConfig)
    performance: PerformanceConfig = field(default_factory=PerformanceConfig)
    quality: QualityConfig = field(default_factory=QualityConfig)
    document_processing: DocumentProcessingConfig = field(default_factory=DocumentProcessingConfig)
    
    # Globale Einstellungen
    debug_mode: bool = False
    log_level: str = "INFO"
    environment: str = "development"  # "development", "staging", "production"
    
    @classmethod
    def from_file(cls, config_path: str) -> 'RAGOptimizerConfig':
        """Lädt Konfiguration aus JSON-Datei"""
        with open(config_path, 'r', encoding='utf-8') as f:
            config_dict = json.load(f)
        
        # Erstelle Sub-Configs
        config = cls()
        
        if 'chunking' in config_dict:
            config.chunking = ChunkingConfig(**config_dict['chunking'])
        if 'embedding' in config_dict:
            config.embedding = EmbeddingConfig(**config_dict['embedding'])
        if 'retrieval' in config_dict:
            config.retrieval = RetrievalConfig(**config_dict['retrieval'])
        if 'cache' in config_dict:
            config.cache = CacheConfig(**config_dict['cache'])
        if 'performance' in config_dict:
            config.performance = PerformanceConfig(**config_dict['performance'])
        if 'quality' in config_dict:
            config.quality = QualityConfig(**config_dict['quality'])
        if 'document_processing' in config_dict:
            config.document_processing = DocumentProcessingConfig(**config_dict['document_processing'])
        
        # Globale Settings
        for key in ['debug_mode', 'log_level', 'environment']:
            if key in config_dict:
                setattr(config, key, config_dict[key])
        
        return config
    
    @classmethod
    def from_env(cls) -> 'RAGOptimizerConfig':
        """Erstellt Konfiguration aus Umgebungsvariablen"""
        config = cls()
        
        # Überschreibe mit Umgebungsvariablen
        env_mappings = {
            'RAG_DEBUG_MODE': ('debug_mode', bool),
            'RAG_LOG_LEVEL': ('log_level', str),
            'RAG_ENVIRONMENT': ('environment', str),
            
            # Chunking
            'RAG_CHUNK_MIN_SIZE': ('chunking.min_chunk_size', int),
            'RAG_CHUNK_TARGET_SIZE': ('chunking.target_chunk_size', int),
            'RAG_CHUNK_MAX_SIZE': ('chunking.max_chunk_size', int),
            
            # Embedding
            'RAG_EMBEDDING_MODEL': ('embedding.model_name', str),
            'RAG_EMBEDDING_DEVICE': ('embedding.device', str),
            'RAG_EMBEDDING_BATCH_SIZE': ('embedding.batch_size', int),
            
            # Retrieval
            'RAG_DENSE_WEIGHT': ('retrieval.dense_weight', float),
            'RAG_SPARSE_WEIGHT': ('retrieval.sparse_weight', float),
            'RAG_USE_RERANKING': ('retrieval.use_reranking', bool),
            
            # Cache
            'RAG_CACHE_BACKEND': ('cache.backend', str),
            'RAG_REDIS_HOST': ('cache.redis_host', str),
            'RAG_REDIS_PORT': ('cache.redis_port', int),
        }
        
        for env_key, (config_path, type_func) in env_mappings.items():
            if env_key in os.environ:
                value = type_func(os.environ[env_key])
                
                # Navigiere zum richtigen Attribut
                parts = config_path.split('.')
                obj = config
                for part in parts[:-1]:
                    obj = getattr(obj, part)
                setattr(obj, parts[-1], value)
        
        return config
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert Config zu Dictionary"""
        return {
            'chunking': self.chunking.__dict__,
            'embedding': self.embedding.__dict__,
            'retrieval': self.retrieval.__dict__,
            'cache': self.cache.__dict__,
            'performance': self.performance.__dict__,
            'quality': self.quality.__dict__,
            'document_processing': self.document_processing.__dict__,
            'debug_mode': self.debug_mode,
            'log_level': self.log_level,
            'environment': self.environment
        }
    
    def save(self, config_path: str):
        """Speichert Konfiguration in JSON-Datei"""
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, indent=2)
    
    def get_environment_config(self) -> 'RAGOptimizerConfig':
        """Gibt umgebungsspezifische Konfiguration zurück"""
        config = self
        
        if self.environment == 'production':
            # Production-Optimierungen
            config.debug_mode = False
            config.log_level = 'WARNING'
            config.performance.monitoring_enabled = True
            config.cache.backend = 'redis'
            config.embedding.device = 'cuda'
            config.retrieval.use_reranking = True
            
        elif self.environment == 'staging':
            # Staging-Einstellungen
            config.debug_mode = True
            config.log_level = 'INFO'
            config.performance.monitoring_enabled = True
            
        else:  # development
            # Development-Einstellungen
            config.debug_mode = True
            config.log_level = 'DEBUG'
            config.cache.backend = 'memory'
            config.embedding.batch_size = 8
            config.performance.max_workers = 2
        
        return config


# Vordefinierte Konfigurationen
def get_default_config() -> RAGOptimizerConfig:
    """Standard-Konfiguration"""
    return RAGOptimizerConfig()


def get_performance_config() -> RAGOptimizerConfig:
    """Performance-optimierte Konfiguration"""
    config = RAGOptimizerConfig()
    
    # Maximale Performance
    config.chunking.batch_size = 200
    config.chunking.max_threads = 8
    
    config.embedding.batch_size = 64
    config.embedding.device = "cuda"
    config.embedding.fp16 = True
    
    config.retrieval.faiss_index_type = "IVF"
    config.retrieval.dense_top_k = 50
    
    config.cache.backend = "redis"
    config.cache.compression_enabled = True
    
    config.performance.max_workers = 8
    config.performance.batch_processor_enabled = True
    
    return config


def get_quality_config() -> RAGOptimizerConfig:
    """Qualitäts-optimierte Konfiguration"""
    config = RAGOptimizerConfig()
    
    # Maximale Qualität
    config.chunking.min_coherence_score = 0.8
    config.chunking.overlap_ratio = 0.2
    
    config.embedding.model_name = "BAAI/bge-m3"
    config.embedding.max_sequence_length = 768
    
    config.retrieval.use_reranking = True
    config.retrieval.rerank_top_k = 20
    config.retrieval.dense_weight = 0.7
    
    config.quality.min_chunk_coherence = 0.7
    config.quality.min_readability_score = 40.0
    
    return config


def get_balanced_config() -> RAGOptimizerConfig:
    """Ausgewogene Konfiguration (Performance + Qualität)"""
    config = RAGOptimizerConfig()
    
    # Balancierte Einstellungen
    config.chunking.target_chunk_size = 600
    config.chunking.overlap_ratio = 0.15
    
    config.embedding.batch_size = 32
    config.embedding.device = "cuda" if os.path.exists('/usr/bin/nvidia-smi') else "cpu"
    
    config.retrieval.dense_weight = 0.6
    config.retrieval.use_reranking = True
    config.retrieval.rerank_top_k = 10
    
    config.cache.backend = "redis" if os.system("redis-cli ping") == 0 else "memory"
    
    config.performance.max_workers = 4
    config.performance.monitoring_enabled = True
    
    return config


# Beispiel-Konfigurationsdatei
EXAMPLE_CONFIG_JSON = """
{
  "environment": "production",
  "debug_mode": false,
  "log_level": "INFO",
  
  "chunking": {
    "min_chunk_size": 200,
    "target_chunk_size": 600,
    "max_chunk_size": 1000,
    "overlap_ratio": 0.15,
    "min_coherence_score": 0.7
  },
  
  "embedding": {
    "model_name": "BAAI/bge-m3",
    "device": "cuda",
    "batch_size": 32,
    "cache_enabled": true
  },
  
  "retrieval": {
    "dense_weight": 0.6,
    "sparse_weight": 0.4,
    "use_reranking": true,
    "final_top_k": 5
  },
  
  "cache": {
    "backend": "redis",
    "redis_host": "localhost",
    "redis_port": 6379,
    "default_ttl": 3600
  },
  
  "performance": {
    "batch_processor_enabled": true,
    "max_workers": 4,
    "monitoring_enabled": true
  },
  
  "quality": {
    "min_readability_score": 30.0,
    "min_chunk_coherence": 0.6
  },
  
  "document_processing": {
    "source_dir": "data/raw_docs",
    "watch_enabled": true,
    "supported_formats": [".pdf", ".docx", ".txt", ".md"]
  }
}
"""


if __name__ == "__main__":
    # Beispiel-Verwendung
    print("RAG Optimizer Configuration Examples\n" + "="*50)
    
    # Standard-Config
    default_config = get_default_config()
    print("\nDefault Config:")
    print(f"  Chunk Size: {default_config.chunking.target_chunk_size}")
    print(f"  Embedding Model: {default_config.embedding.model_name}")
    print(f"  Cache Backend: {default_config.cache.backend}")
    
    # Performance-Config
    perf_config = get_performance_config()
    print("\nPerformance Config:")
    print(f"  Batch Size: {perf_config.embedding.batch_size}")
    print(f"  Workers: {perf_config.performance.max_workers}")
    print(f"  Index Type: {perf_config.retrieval.faiss_index_type}")
    
    # Speichere Beispiel-Config
    example_path = "rag_config_example.json"
    with open(example_path, 'w') as f:
        f.write(EXAMPLE_CONFIG_JSON)
    print(f"\nBeispiel-Config gespeichert in: {example_path}")
    
    # Lade Config
    loaded_config = RAGOptimizerConfig.from_file(example_path)
    print(f"\nGeladene Config - Environment: {loaded_config.environment}")
    
    # Cleanup
    os.remove(example_path)