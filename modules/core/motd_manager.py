import json
from pathlib import Path
from typing import Dict, Any, Optional

from ..core.config import Config
from ..core.logging import LogManager

logger = LogManager.setup_logging(__name__)

class MOTDManager:
    """Verwaltet die Anzeige und Konfiguration des Message of the Day (MOTD)"""
    
    _instance = None
    _motd_config = None
    
    def __new__(cls):
        """Implementierung als Singleton für gemeinsame Nutzung"""
        if cls._instance is None:
            cls._instance = super(MOTDManager, cls).__new__(cls)
            cls._instance._load_config()
        return cls._instance
    
    def _load_config(self) -> None:
        """Lädt die MOTD-Konfiguration aus der JSON-Datei"""
        try:
            motd_path = Config.APP_DIR / 'modules' / 'core' / 'motd_config.json'
            
            if not motd_path.exists():
                logger.warning(f"MOTD-Konfigurationsdatei nicht gefunden: {motd_path}")
                # Standardkonfiguration als Fallback
                self._motd_config = {
                    "enabled": True,
                    "format": "markdown",
                    "content": "🛠️ **BETA-VERSION: Lokaler KI-Assistent für nscale**",
                    "style": {
                        "backgroundColor": "#fff3cd",
                        "borderColor": "#ffeeba",
                        "textColor": "#856404",
                        "iconClass": "info-circle"
                    },
                    "display": {
                        "position": "top",
                        "dismissible": True,
                        "showOnStartup": False,
                        "showInChat": True
                    }
                }
                return
            
            with open(motd_path, 'r', encoding='utf-8') as f:
                self._motd_config = json.load(f)
                
            logger.info("MOTD-Konfiguration erfolgreich geladen")
        
        except Exception as e:
            logger.error(f"Fehler beim Laden der MOTD-Konfiguration: {e}")
            # Standardkonfiguration als Fallback
            self._motd_config = {
                "enabled": True,
                "format": "markdown",
                "content": "🛠️ **BETA-VERSION: Lokaler KI-Assistent für nscale**",
                "style": {
                    "backgroundColor": "#fff3cd",
                    "borderColor": "#ffeeba",
                    "textColor": "#856404",
                    "iconClass": "info-circle"
                },
                "display": {
                    "position": "top",
                    "dismissible": True,
                    "showOnStartup": True,
                    "showInChat": True
                }
            }
    
    def get_motd(self) -> Dict[str, Any]:
        """Gibt die aktuelle MOTD-Konfiguration zurück"""
        return self._motd_config
    
    def is_enabled(self) -> bool:
        """Prüft, ob MOTD aktiviert ist"""
        return self._motd_config.get("enabled", False)
    
    def get_content(self) -> str:
        """Gibt den MOTD-Inhalt zurück"""
        return self._motd_config.get("content", "")
    
    def get_format(self) -> str:
        """Gibt das Format des MOTD zurück (markdown, html, text)"""
        return self._motd_config.get("format", "text")
    
    def get_style(self) -> Dict[str, str]:
        """Gibt die Stilinformationen für MOTD zurück"""
        return self._motd_config.get("style", {})
    
    def get_display_options(self) -> Dict[str, bool]:
        """Gibt die Anzeigeoptionen für MOTD zurück"""
        return self._motd_config.get("display", {})
    
    def reload_config(self) -> bool:
        """Lädt die MOTD-Konfiguration neu (für Admins)"""
        try:
            self._load_config()
            return True
        except Exception as e:
            logger.error(f"Fehler beim Neuladen der MOTD-Konfiguration: {e}")
            return False