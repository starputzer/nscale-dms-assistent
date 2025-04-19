import logging
from logging.handlers import RotatingFileHandler
import sys
from .config import Config

class LogManager:
    """Manager für Logging-Funktionalitäten"""
    
    @classmethod
    def setup_logging(cls):
        """Richtet das Logging-System ein"""
        logger = logging.getLogger('nscale_assist')
        logger.setLevel(logging.INFO)
        
        # File Handler mit Rotation
        file_handler = RotatingFileHandler(
            Config.LOG_PATH, 
            maxBytes=10*1024*1024,  # 10 MB
            backupCount=5
        )
        
        # Console Handler
        console_handler = logging.StreamHandler(sys.stdout)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        # Handler hinzufügen
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
        return logger
