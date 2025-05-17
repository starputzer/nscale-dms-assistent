import logging
from logging.handlers import RotatingFileHandler
import sys
from pathlib import Path

from .config import Config

class LogManager:
    """Manager für Logging-Funktionalitäten"""
    
    _loggers = {}  # Cache für bereits erstellte Logger
    
    @classmethod
    def setup_logging(cls, name='nscale_assist'):
        """Richtet das Logging-System ein"""
        # Prüfe ob Logger bereits existiert, um Duplikate zu vermeiden
        if name in cls._loggers:
            return cls._loggers[name]
        
        # Stelle sicher, dass das Log-Verzeichnis existiert
        log_path = Config.LOG_PATH
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Erstelle Logger mit Namen (verhindert Duplikate)
        logger = logging.getLogger(name)
        
        # Setze Level nur, wenn Logger neu ist
        if not logger.handlers:
            logger.setLevel(logging.INFO)
            
            # File Handler mit Rotation
            file_handler = RotatingFileHandler(
                log_path, 
                maxBytes=10*1024*1024,  # 10 MB
                backupCount=5,
                encoding='utf-8'  # Explizite Kodierung
            )
            
            # Console Handler
            console_handler = logging.StreamHandler(sys.stdout)
            
            # Formatter mit Modul-Information
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - [%(module)s:%(lineno)d] - %(message)s'
            )
            file_handler.setFormatter(formatter)
            console_handler.setFormatter(formatter)
            
            # Handler hinzufügen
            logger.addHandler(file_handler)
            logger.addHandler(console_handler)
            
            # Verhindere Propagation an Root-Logger (wichtig!)
            logger.propagate = False
        
        # Speichere Logger im Cache
        cls._loggers[name] = logger
        
        return logger