import os
from pathlib import Path

class Config:
    """Zentrale Konfigurationsklasse"""
    
    # Systempfade
    BASE_DIR = Path(os.getenv('BASE_DIR', '/opt/nscale-assist'))
    APP_DIR = BASE_DIR / 'app'
    TXT_DIR = BASE_DIR / 'data' / 'txt'
    CACHE_DIR = BASE_DIR / 'cache'
    EMBED_CACHE_PATH = CACHE_DIR / 'embeddings' / 'embeddings.pkl'
    RESULT_CACHE_DIR = CACHE_DIR / 'results'
    LOG_PATH = BASE_DIR / 'logs' / 'app.log'
    DB_PATH = BASE_DIR / 'data' / 'db' / 'users.db'
    
    # LLM-Konfiguration
    OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
<<<<<<< HEAD
    MODEL_NAME = os.getenv('MODEL_NAME', 'llama3-nscale')  # Verwende llama3-nscale
    LLM_TIMEOUT = float(os.getenv('LLM_TIMEOUT', '120.0'))  # Höheren Timeout für das größere Modell (2 Minuten)
=======
    MODEL_NAME = os.getenv('MODEL_NAME', 'llama3-nscale')  # Wechsel zu Mistral
    LLM_TIMEOUT = float(os.getenv('LLM_TIMEOUT', '60.0'))  # Höheren Timeout für das größere Modell
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    LLM_CONTEXT_SIZE = int(os.getenv('LLM_CONTEXT_SIZE', '8192'))  # Größerer Kontext
    LLM_MAX_TOKENS = int(os.getenv('LLM_MAX_TOKENS', '4096'))  # Mehr Output-Tokens
    MAX_PROMPT_LENGTH = int(os.getenv('MAX_PROMPT_LENGTH', '7500'))  # Längere Prompts erlauben
    
    # RAG-Konfiguration
    CHUNK_SIZE = int(os.getenv('CHUNK_SIZE', '750'))  # Weiter erhöht
    CHUNK_OVERLAP = int(os.getenv('CHUNK_OVERLAP', '100'))  # erhöht
    TOP_K = int(os.getenv('TOP_K', '10'))  # von 2 auf 10 (TEST) relevante Chunks
    SEMANTIC_WEIGHT = float(os.getenv('SEMANTIC_WEIGHT', '0.7'))
    
    # Fallback-Konfiguration
    FALLBACK_ENABLED = os.getenv('FALLBACK_ENABLED', 'true').lower() == 'true'
    FALLBACK_TIMEOUT = float(os.getenv('FALLBACK_TIMEOUT', '5.0'))  # Wartezeit vor Fallback
    
    # Caching
    CACHE_EXPIRE = int(os.getenv('CACHE_EXPIRE', '604800'))  # 7 Tage
    
    # Sicherheit
    SECRET_KEY = os.getenv('SECRET_KEY', 'generate-a-secure-random-key-in-production')
    PASSWORD_SALT = os.getenv('PASSWORD_SALT', 'generate-a-secure-salt-in-production')
    JWT_EXPIRATION = int(os.getenv('JWT_EXPIRATION', '86400'))  # 24 Stunden
    
    # Server-Konfiguration
    HOST = os.getenv('HOST', '0.0.0.0')
<<<<<<< HEAD
    PORT = int(os.getenv('PORT', '8000'))
=======
    PORT = int(os.getenv('PORT', '8080'))
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    WORKERS = int(os.getenv('WORKERS', '4'))
    
    # Thread-Pool-Konfiguration
    THREAD_POOL_SIZE = int(os.getenv('THREAD_POOL_SIZE', '2'))  # Minimal
    
<<<<<<< HEAD
    # RAG Optimization Feature Toggle
    USE_OPTIMIZED_RAG = os.getenv('USE_OPTIMIZED_RAG', 'false').lower() == 'true'
    RAG_OPTIMIZATION_MODE = os.getenv('RAG_OPTIMIZATION_MODE', 'shadow')  # shadow, canary, full
    CANARY_PERCENTAGE = os.getenv('CANARY_PERCENTAGE', '10')  # Percentage for canary mode
    
    # RAG Optimization Paths
    RAG_RAW_DOCS_DIR = BASE_DIR / 'data' / 'raw_docs'
    RAG_CONVERTED_DIR = BASE_DIR / 'data' / 'converted' 
    RAG_INDEX_DIR = CACHE_DIR / 'document_index'
    RAG_HYBRID_INDEX_DIR = CACHE_DIR / 'hybrid_index'
    
    # Redis Configuration (for optimized RAG)
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', '6379'))
    REDIS_DB = int(os.getenv('REDIS_DB', '0'))
    
    @classmethod
    def init_directories(cls):
        """Initialisiert notwendige Verzeichnisse"""
        directories = [
            cls.TXT_DIR, cls.CACHE_DIR, cls.RESULT_CACHE_DIR, 
            cls.BASE_DIR / 'logs', cls.BASE_DIR / 'data' / 'db',
            cls.EMBED_CACHE_PATH.parent
        ]
        
        # Add RAG optimization directories if enabled
        if cls.USE_OPTIMIZED_RAG:
            directories.extend([
                cls.RAG_RAW_DOCS_DIR,
                cls.RAG_CONVERTED_DIR,
                cls.RAG_INDEX_DIR,
                cls.RAG_HYBRID_INDEX_DIR,
                cls.BASE_DIR / 'logs' / 'rag_optimization'
            ])
        
        for directory in directories:
=======
    @classmethod
    def init_directories(cls):
        """Initialisiert notwendige Verzeichnisse"""
        for directory in [cls.TXT_DIR, cls.CACHE_DIR, cls.RESULT_CACHE_DIR, 
                         cls.BASE_DIR / 'logs', cls.BASE_DIR / 'data' / 'db',
                         cls.EMBED_CACHE_PATH.parent]:
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
            directory.mkdir(parents=True, exist_ok=True)