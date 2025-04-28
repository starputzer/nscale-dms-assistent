"""
Konfigurationsmodul für die Dokumentenkonvertierungspipeline.
Lädt und verwaltet die Konfiguration der Pipeline.
"""

import os
import json
from pathlib import Path
import logging
from typing import Dict, Any, Optional, Union

class ConfigManager:
    """Lädt und verwaltet die Konfiguration der Konvertierungspipeline"""
    
    # Standard-Konfiguration
    DEFAULT_CONFIG = {
        # Verzeichnispfade
        'source_dir': 'data/raw_docs',
        'target_dir': 'data/txt',
        'inventory_dir': 'doc_converter/data/inventory',
        'temp_dir': 'doc_converter/data/temp',
        
        # Formatunterstützung
        'supported_extensions': [
            '.pdf', '.docx', '.doc', '.xlsx', '.xls', 
            '.pptx', '.ppt', '.html', '.htm', '.md', '.txt'
        ],
        
        # Pipeline-Optionen
        'parallel_processing': True,
        'max_workers': 4,
        'post_processing': True,
        'validate_results': True,
        
        # Logging
        'log_level': 'INFO',
        'log_to_file': True,
        'log_file': 'doc_converter.log',
        
        # Converter-Optionen
        'pdf_converter': {
            'extract_images': True,
            'max_image_size': 1024,
            'detect_tables': True,
            'table_detection_method': 'hybrid',
            'ocr_enabled': False
        },
        'docx_converter': {
            'extract_images': True,
            'max_image_size': 1024,
            'extract_comments': False,
            'use_mammoth': True
        },
        'excel_converter': {
            'extract_all_sheets': True,
            'max_rows': 1000,
            'max_cols': 20
        },
        'html_converter': {
            'extract_images': True,
            'download_remote_images': False,
            'extract_metadata': True
        },
        
        # Nachbearbeitungs-Optionen
        'cleaner': {
            'fix_headings': True,
            'fix_links': True,
            'fix_tables': True,
            'fix_lists': True,
            'fix_code_blocks': True,
            'fix_line_breaks': True,
            'standardize_emphasis': True,
            'remove_html': False,
            'max_line_length': 0,
            'list_marker': '*'
        },
        'structure_fixer': {
            'fix_heading_hierarchy': True,
            'fix_heading_capitalize': True,
            'fix_paragraph_breaks': True,
            'fix_list_formatting': True,
            'create_missing_sections': False,
            'improve_frontmatter': True
        },
        'table_formatter': {
            'align_columns': True,
            'auto_align_numbers': True,
            'fix_column_widths': True,
            'max_column_width': 30,
            'min_column_width': 3,
            'pretty_format': True
        },
        'validator': {
            'min_content_length': 100,
            'max_content_length': 1000000,
            'max_line_length': 120,
            'check_broken_links': True,
            'check_images': True,
            'check_frontmatter': True,
            'check_heading_hierarchy': True
        }
    }
    
    @classmethod
    def load_config(cls, config_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Lädt die Konfiguration aus einer Datei oder verwendet die Standardkonfiguration.
        
        Args:
            config_path: Pfad zur Konfigurationsdatei
            
        Returns:
            Dictionary mit Konfiguration
        """
        # Logger erstellen
        logger = logging.getLogger(__name__)
        
        # Standardkonfiguration kopieren
        config = cls.DEFAULT_CONFIG.copy()
        
        # Prüfe, ob Umgebungsvariable für Konfigurationspfad existiert
        if not config_path and 'DOC_CONVERTER_CONFIG' in os.environ:
            config_path = os.environ['DOC_CONVERTER_CONFIG']
        
        # Prüfe Standard-Konfigurationspfade, wenn kein Pfad angegeben wurde
        if not config_path:
            standard_paths = [
                'doc_converter/config/converter_config.json',
                'config/converter_config.json',
                'converter_config.json'
            ]
            
            for path in standard_paths:
                if Path(path).exists():
                    config_path = path
                    break
        
        # Lade Konfiguration aus Datei
        if config_path and Path(config_path).exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    custom_config = json.load(f)
                
                # Übe Deep-Merge von Standard- und benutzerdefinierter Konfiguration aus
                config = cls._deep_merge(config, custom_config)
                
                logger.info(f"Konfiguration geladen aus: {config_path}")
            except Exception as e:
                logger.error(f"Fehler beim Laden der Konfiguration aus {config_path}: {e}")
        else:
            logger.info("Verwende Standardkonfiguration")
        
        # Erweitere die Konfiguration mit Umgebungsvariablen
        config = cls._override_with_env_vars(config)
        
        return config
    
    @staticmethod
    def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """
        Führt einen tiefen Merge zweier Dictionaries durch.
        
        Args:
            base: Basis-Dictionary
            override: Dictionary mit zu überlagernden Werten
            
        Returns:
            Kombiniertes Dictionary
        """
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                # Rekursiv für verschachtelte Dictionaries
                result[key] = ConfigManager._deep_merge(result[key], value)
            else:
                # Direkte Überschreibung bei einfachen Werten oder wenn Typen nicht übereinstimmen
                result[key] = value
        
        return result
    
    @staticmethod
    def _override_with_env_vars(config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Überschreibt Konfigurationswerte mit Umgebungsvariablen.
        
        Args:
            config: Konfigurationswörterbuch
            
        Returns:
            Aktualisiertes Konfigurationswörterbuch
        """
        # Logger erstellen
        logger = logging.getLogger(__name__)
        
        # Präfix für Umgebungsvariablen
        env_prefix = 'DOC_CONVERTER_'
        
        # Suche nach relevanten Umgebungsvariablen
        for env_var, env_value in os.environ.items():
            if env_var.startswith(env_prefix):
                # Entferne Präfix
                config_key = env_var[len(env_prefix):].lower()
                
                # Konvertiere Wert zu entsprechendem Typ
                try:
                    # Versuche JSON zu parsen
                    value = json.loads(env_value)
                except json.JSONDecodeError:
                    # Fallback zu String
                    value = env_value
                
                # Behandle komplexe Pfade (mit Punkten)
                if '.' in config_key:
                    parts = config_key.split('.')
                    current = config
                    
                    # Navigiere zur richtigen Position
                    for part in parts[:-1]:
                        if part not in current:
                            current[part] = {}
                        current = current[part]
                    
                    # Setze Wert
                    current[parts[-1]] = value
                    logger.info(f"Konfiguration überschrieben durch Umgebungsvariable {env_var}: {parts} = {value}")
                else:
                    # Einfacher Fall: Direkter Schlüssel
                    config[config_key] = value
                    logger.info(f"Konfiguration überschrieben durch Umgebungsvariable {env_var}: {config_key} = {value}")
        
        return config
    
    @staticmethod
    def save_config(config: Dict[str, Any], config_path: str) -> bool:
        """
        Speichert eine Konfiguration in eine Datei.
        
        Args:
            config: Konfigurationswörterbuch
            config_path: Pfad zur Konfigurationsdatei
            
        Returns:
            True bei Erfolg, sonst False
        """
        # Logger erstellen
        logger = logging.getLogger(__name__)
        
        try:
            # Stelle sicher, dass das Verzeichnis existiert
            path = Path(config_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            
            # Speichere Konfiguration
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Konfiguration gespeichert in: {config_path}")
            return True
        
        except Exception as e:
            logger.error(f"Fehler beim Speichern der Konfiguration: {e}")
            return False
    
    @staticmethod
    def get_component_config(config: Dict[str, Any], component_name: str) -> Dict[str, Any]:
        """
        Extrahiert die Konfiguration für eine bestimmte Komponente.
        
        Args:
            config: Gesamtes Konfigurationswörterbuch
            component_name: Name der Komponente
            
        Returns:
            Konfiguration der Komponente oder leeres Dictionary, wenn nicht gefunden
        """
        return config.get(component_name, {})


if __name__ == "__main__":
    # Setup Logging
    logging.basicConfig(level=logging.INFO, 
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Test des ConfigManager
    import sys
    import pprint
    
    # Lade Konfiguration
    if len(sys.argv) > 1:
        config_path = sys.argv[1]
        config = ConfigManager.load_config(config_path)
    else:
        config = ConfigManager.load_config()
    
    # Gib Konfiguration aus
    print("Geladene Konfiguration:")
    pprint.pprint(config)
    
    # Speichere Standardkonfiguration
    if '--save-default' in sys.argv:
        save_path = 'doc_converter/config/default_config.json'
        if ConfigManager.save_config(ConfigManager.DEFAULT_CONFIG, save_path):
            print(f"Standardkonfiguration gespeichert in: {save_path}")
        else:
            print("Fehler beim Speichern der Standardkonfiguration")