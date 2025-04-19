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
    MODEL_NAME = os.getenv('MODEL_NAME', 'tiny-tuned')  # optimiertes Modell
    OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
    LLM_TIMEOUT = float(os.getenv('LLM_TIMEOUT', '60.0'))  # Reduziert auf 60 Sekunden
    LLM_CONTEXT_SIZE = int(os.getenv('LLM_CONTEXT_SIZE', '2048'))
    LLM_MAX_TOKENS = int(os.getenv('LLM_MAX_TOKENS', '512'))  # Reduziert Ausgabetokens
    MAX_PROMPT_LENGTH = int(os.getenv('MAX_PROMPT_LENGTH', '2000'))  # Stark reduziert
    
    # RAG-Konfiguration
    CHUNK_SIZE = int(os.getenv('CHUNK_SIZE', '250'))  # Weiter reduziert
    CHUNK_OVERLAP = int(os.getenv('CHUNK_OVERLAP', '50'))  # Minimal
    TOP_K = int(os.getenv('TOP_K', '2'))  # Nur 2 relevante Chunks
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
    PORT = int(os.getenv('PORT', '8080'))
    WORKERS = int(os.getenv('WORKERS', '4'))
    
    # Thread-Pool-Konfiguration
    THREAD_POOL_SIZE = int(os.getenv('THREAD_POOL_SIZE', '2'))  # Minimal
    
    @classmethod
    def init_directories(cls):
        """Initialisiert notwendige Verzeichnisse"""
        for directory in [cls.TXT_DIR, cls.CACHE_DIR, cls.RESULT_CACHE_DIR, 
                         cls.BASE_DIR / 'logs', cls.BASE_DIR / 'data' / 'db',
                         cls.EMBED_CACHE_PATH.parent]:
            directory.mkdir(parents=True, exist_ok=True)