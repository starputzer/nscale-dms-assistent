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
    MODEL_NAME = os.getenv('MODEL_NAME', 'tinyllama')
    OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
    LLM_TIMEOUT = float(os.getenv('LLM_TIMEOUT', '180.0'))  # Timeout in Sekunden
    LLM_CONTEXT_SIZE = int(os.getenv('LLM_CONTEXT_SIZE', '2048'))  # Maximale Kontextgröße
    LLM_MAX_TOKENS = int(os.getenv('LLM_MAX_TOKENS', '1024'))  # Maximale Token-Anzahl für die Ausgabe
    MAX_PROMPT_LENGTH = int(os.getenv('MAX_PROMPT_LENGTH', '3000'))  # Maximale Eingabezeichen
    
    # RAG-Konfiguration
    CHUNK_SIZE = int(os.getenv('CHUNK_SIZE', '400'))  # Verkleinert von 500
    CHUNK_OVERLAP = int(os.getenv('CHUNK_OVERLAP', '100'))  # Verkleinert von 250
    TOP_K = int(os.getenv('TOP_K', '3'))  # Reduziert von 5 auf 3
    SEMANTIC_WEIGHT = float(os.getenv('SEMANTIC_WEIGHT', '0.7'))
    
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
    THREAD_POOL_SIZE = int(os.getenv('THREAD_POOL_SIZE', '4'))  # Reduziert von 10 auf 4
    
    @classmethod
    def init_directories(cls):
        """Initialisiert notwendige Verzeichnisse"""
        for directory in [cls.TXT_DIR, cls.CACHE_DIR, cls.RESULT_CACHE_DIR, 
                         cls.BASE_DIR / 'logs', cls.BASE_DIR / 'data' / 'db',
                         cls.EMBED_CACHE_PATH.parent]:  # Stelle sicher, dass das Embedding-Cache-Verzeichnis existiert
            directory.mkdir(parents=True, exist_ok=True)