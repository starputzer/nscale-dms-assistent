"""
Logger-Modul für die Dokumentenkonvertierungspipeline.
Stellt einheitliches Logging für alle Komponenten bereit.
"""

import os
import logging
import logging.handlers
from typing import Optional, Dict, Any
from pathlib import Path
import datetime
import json
import sys

class LogManager:
    """Verwaltet die Logging-Konfiguration für die Konvertierungspipeline"""
    
    # Klassenattribute für Logger-Instanzen
    _root_logger = None
    _loggers = {}
    
    @classmethod
    def setup_logging(cls, 
                      log_level: str = "INFO", 
                      log_to_file: bool = True, 
                      log_file: Optional[str] = None,
                      log_format: Optional[str] = None,
                      config: Optional[Dict[str, Any]] = None) -> logging.Logger:
        """
        Richtet das Logging-System ein.
        
        Args:
            log_level: Logging-Level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            log_to_file: Ob in eine Datei geloggt werden soll
            log_file: Pfad zur Log-Datei (Standard: doc_converter.log)
            log_format: Format der Log-Nachrichten
            config: Konfigurationswörterbuch mit Logging-Einstellungen
            
        Returns:
            Root-Logger-Instanz
        """
        if cls._root_logger is not None:
            return cls._root_logger
        
        # Verwende Konfigurationseinstellungen, falls vorhanden
        if config:
            log_level = config.get('log_level', log_level)
            log_to_file = config.get('log_to_file', log_to_file)
            log_file = config.get('log_file', log_file)
            log_format = config.get('log_format', log_format)
        
        # Standardwerte
        if log_file is None:
            log_file = "doc_converter.log"
            
        if log_format is None:
            log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        
        # Konvertiere String-Level zu logging-Level
        numeric_level = getattr(logging, log_level.upper(), None)
        if not isinstance(numeric_level, int):
            raise ValueError(f"Ungültiges Log-Level: {log_level}")
        
        # Konfiguriere Root-Logger
        root_logger = logging.getLogger()
        root_logger.setLevel(numeric_level)
        
        # Entferne bestehende Handler, um doppelte Logs zu vermeiden
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # Formatter erstellen
        formatter = logging.Formatter(log_format)
        
        # Console-Handler hinzufügen
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
        
        # Datei-Handler hinzufügen, falls aktiviert
        if log_to_file:
            # Stelle sicher, dass das Verzeichnis existiert
            log_path = Path(log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Verwende RotatingFileHandler für automatische Rotation
            file_handler = logging.handlers.RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10 MB
                backupCount=5,              # 5 Backup-Dateien
                encoding='utf-8'
            )
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        
        # Speichere Root-Logger
        cls._root_logger = root_logger
        
        root_logger.info(f"Logging initialisiert: Level={log_level}, Datei={log_file if log_to_file else 'Nein'}")
        
        return root_logger
    
    @classmethod
    def get_logger(cls, name: str) -> logging.Logger:
        """
        Gibt einen benannten Logger zurück.
        
        Args:
            name: Name des Loggers
            
        Returns:
            Logger-Instanz
        """
        if name not in cls._loggers:
            # Stelle sicher, dass Root-Logger initialisiert ist
            if cls._root_logger is None:
                cls.setup_logging()
            
            # Erstelle Logger
            logger = logging.getLogger(name)
            cls._loggers[name] = logger
        
        return cls._loggers[name]
    
    @classmethod
    def set_log_level(cls, level: str) -> None:
        """
        Setzt das Logging-Level für alle Logger.
        
        Args:
            level: Logging-Level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        numeric_level = getattr(logging, level.upper(), None)
        if not isinstance(numeric_level, int):
            raise ValueError(f"Ungültiges Log-Level: {level}")
        
        # Setze Level für Root-Logger
        if cls._root_logger:
            cls._root_logger.setLevel(numeric_level)
        
        # Setze Level für alle benannten Logger
        for logger in cls._loggers.values():
            logger.setLevel(numeric_level)
    
    @classmethod
    def get_log_file_path(cls) -> Optional[str]:
        """
        Gibt den Pfad zur aktuellen Log-Datei zurück.
        
        Returns:
            Pfad zur Log-Datei oder None, wenn keine verwendet wird
        """
        if cls._root_logger:
            for handler in cls._root_logger.handlers:
                if isinstance(handler, logging.FileHandler):
                    return handler.baseFilename
        
        return None
    
    @classmethod
    def log_system_info(cls) -> None:
        """Protokolliert Systeminformationen für Debugging-Zwecke"""
        import platform
        import sys
        
        if cls._root_logger is None:
            cls.setup_logging()
        
        logger = cls.get_logger("system_info")
        
        # Sammle Systeminformationen
        system_info = {
            "platform": platform.platform(),
            "python_version": platform.python_version(),
            "python_implementation": platform.python_implementation(),
            "processor": platform.processor(),
            "hostname": platform.node(),
            "pid": os.getpid(),
            "timestamp": datetime.datetime.now().isoformat(),
            "modules": {
                "pandas": hasattr(sys.modules, "pandas"),
                "numpy": hasattr(sys.modules, "numpy"),
                "matplotlib": hasattr(sys.modules, "matplotlib"),
                "nltk": hasattr(sys.modules, "nltk"),
                "PyMuPDF": hasattr(sys.modules, "fitz"),
                "docx": hasattr(sys.modules, "docx"),
                "openpyxl": hasattr(sys.modules, "openpyxl"),
                "pptx": hasattr(sys.modules, "pptx"),
                "camelot": hasattr(sys.modules, "camelot"),
                "tabula": hasattr(sys.modules, "tabula"),
                "beautifulsoup4": hasattr(sys.modules, "bs4"),
                "html2text": hasattr(sys.modules, "html2text")
            },
            "environment_vars": {k: v for k, v in os.environ.items() if k.startswith(("DOC_CONVERTER_", "PYTHONPATH", "PATH"))}
        }
        
        # Logge Informationen
        logger.info(f"Systeminformationen: {json.dumps(system_info, indent=2)}")


class PipelineLogger:
    """Logger-Klasse für Pipeline-Komponenten mit strukturiertem Logging"""
    
    def __init__(self, component_name: str):
        """
        Initialisiert einen Pipeline-Logger.
        
        Args:
            component_name: Name der Komponente
        """
        self.component_name = component_name
        self.logger = LogManager.get_logger(component_name)
        self.start_time = datetime.datetime.now()
        self.metrics = {
            "documents_processed": 0,
            "documents_success": 0,
            "documents_failed": 0,
            "warnings_count": 0,
            "errors_count": 0,
            "start_time": self.start_time.isoformat(),
            "processing_times": []
        }
    
    def log_start(self, operation: str, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Protokolliert den Start einer Operation.
        
        Args:
            operation: Name der Operation
            details: Zusätzliche Details
        """
        message = f"START: {operation}"
        if details:
            message += f" - {json.dumps(details)}"
        
        self.logger.info(message)
    
    def log_end(self, operation: str, success: bool, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Protokolliert das Ende einer Operation.
        
        Args:
            operation: Name der Operation
            success: Ob die Operation erfolgreich war
            details: Zusätzliche Details
        """
        status = "SUCCESS" if success else "FAILED"
        message = f"END: {operation} - {status}"
        
        if details:
            message += f" - {json.dumps(details)}"
        
        if success:
            self.logger.info(message)
        else:
            self.logger.error(message)
    
    def log_document_processed(self, document_path: str, success: bool, processing_time: float, 
                             details: Optional[Dict[str, Any]] = None) -> None:
        """
        Protokolliert die Verarbeitung eines Dokuments.
        
        Args:
            document_path: Pfad zum Dokument
            success: Ob die Verarbeitung erfolgreich war
            processing_time: Verarbeitungszeit in Sekunden
            details: Zusätzliche Details
        """
        self.metrics["documents_processed"] += 1
        
        if success:
            self.metrics["documents_success"] += 1
            level = logging.INFO
            status = "SUCCESS"
        else:
            self.metrics["documents_failed"] += 1
            level = logging.ERROR
            status = "FAILED"
        
        # Speichere Verarbeitungszeit
        self.metrics["processing_times"].append(processing_time)
        
        # Erstelle Nachricht
        message = f"DOCUMENT: {document_path} - {status} - Zeit: {processing_time:.2f}s"
        
        if details:
            message += f" - {json.dumps(details)}"
        
        self.logger.log(level, message)
    
    def log_warning(self, message: str, document_path: Optional[str] = None) -> None:
        """
        Protokolliert eine Warnung.
        
        Args:
            message: Warnungsmeldung
            document_path: Optionaler Pfad zum Dokument
        """
        self.metrics["warnings_count"] += 1
        
        if document_path:
            self.logger.warning(f"WARNING: {document_path} - {message}")
        else:
            self.logger.warning(f"WARNING: {message}")
    
    def log_error(self, message: str, document_path: Optional[str] = None, exception: Optional[Exception] = None) -> None:
        """
        Protokolliert einen Fehler.
        
        Args:
            message: Fehlermeldung
            document_path: Optionaler Pfad zum Dokument
            exception: Optionale Exception-Instanz
        """
        self.metrics["errors_count"] += 1
        
        if document_path:
            error_message = f"ERROR: {document_path} - {message}"
        else:
            error_message = f"ERROR: {message}"
        
        if exception:
            self.logger.error(error_message, exc_info=exception)
        else:
            self.logger.error(error_message)
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Gibt die aktuellen Metriken zurück.
        
        Returns:
            Dictionary mit Metriken
        """
        # Aktualisiere End-Zeit und berechne Gesamtzeit
        end_time = datetime.datetime.now()
        total_time = (end_time - self.start_time).total_seconds()
        
        # Aktualisiere Metriken
        metrics = self.metrics.copy()
        metrics["end_time"] = end_time.isoformat()
        metrics["total_time"] = total_time
        
        # Berechne Statistiken für Verarbeitungszeiten
        if metrics["processing_times"]:
            metrics["avg_processing_time"] = sum(metrics["processing_times"]) / len(metrics["processing_times"])
            metrics["min_processing_time"] = min(metrics["processing_times"])
            metrics["max_processing_time"] = max(metrics["processing_times"])
        
        return metrics
    
    def log_metrics(self) -> None:
        """Protokolliert die aktuellen Metriken"""
        metrics = self.get_metrics()
        
        # Erstelle übersichtliche Zusammenfassung
        summary = [
            f"Komponente: {self.component_name}",
            f"Gesamtzeit: {metrics['total_time']:.2f}s",
            f"Dokumente verarbeitet: {metrics['documents_processed']}",
            f"Erfolgreich: {metrics['documents_success']}",
            f"Fehlgeschlagen: {metrics['documents_failed']}",
            f"Warnungen: {metrics['warnings_count']}",
            f"Fehler: {metrics['errors_count']}"
        ]
        
        if "avg_processing_time" in metrics:
            summary.append(f"Durchschnittliche Verarbeitungszeit: {metrics['avg_processing_time']:.2f}s")
            summary.append(f"Minimale Verarbeitungszeit: {metrics['min_processing_time']:.2f}s")
            summary.append(f"Maximale Verarbeitungszeit: {metrics['max_processing_time']:.2f}s")
        
        self.logger.info(f"METRICS SUMMARY:\n" + "\n".join(summary))


# Test-Code, wenn das Skript direkt ausgeführt wird
if __name__ == "__main__":
    # Initialisiere Logging
    logger = LogManager.setup_logging(log_level="DEBUG")
    
    # Ausgabe von Test-Logs
    logger.debug("Debug-Nachricht vom Root-Logger")
    logger.info("Info-Nachricht vom Root-Logger")
    logger.warning("Warnungsnachricht vom Root-Logger")
    logger.error("Fehlernachricht vom Root-Logger")
    
    # Teste PipelineLogger
    pipeline_logger = PipelineLogger("test_component")
    pipeline_logger.log_start("test_operation", {"param1": "value1"})
    
    # Simuliere Dokumentenverarbeitung
    import time
    import random
    
    for i in range(5):
        document_path = f"test_document_{i}.pdf"
        processing_time = random.uniform(0.5, 2.0)
        time.sleep(0.1)  # Kurze Pause zur Simulation der Verarbeitung
        success = random.random() > 0.3  # 70% Erfolgswahrscheinlichkeit
        
        if not success:
            pipeline_logger.log_error(f"Fehler bei Dokument {i}", document_path)
        
        pipeline_logger.log_document_processed(
            document_path, 
            success, 
            processing_time, 
            {"file_size": random.randint(100, 5000)}
        )
    
    pipeline_logger.log_end("test_operation", True, {"processed": 5})
    pipeline_logger.log_metrics()
    
    # Logge Systeminformationen
    LogManager.log_system_info()