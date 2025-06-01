"""
Basiskonverter für die Dokumentenkonvertierungspipeline.
Definiert die gemeinsame Schnittstelle und Funktionalität für alle Konverter.
"""

import os
from abc import ABC, abstractmethod
import logging
from typing import Dict, Any, Optional
from pathlib import Path
import yaml
import shutil
import re

class BaseConverter(ABC):
    """Abstrakte Basisklasse für alle Dokumentenkonverter"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialisiert den Basiskonverter.
        
        Args:
            config: Konfigurationswörterbuch mit Konvertereinstellungen
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self.config = config or {}
        
        # Lade Vorlagen
        self.templates_dir = self.config.get('templates_dir', 'doc_converter/templates')
        self.markdown_template_path = Path(self.templates_dir) / 'markdown_template.md'
        self.frontmatter_template_path = Path(self.templates_dir) / 'frontmatter_template.yml'
    
    def convert(self, source_path: str, target_dir: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Konvertiert ein Dokument in Markdown.
        
        Args:
            source_path: Pfad zur Quelldatei
            target_dir: Zielverzeichnis für die konvertierte Datei
            metadata: Zusätzliche Metadaten für das Dokument
            
        Returns:
            Dictionary mit Informationen über die Konvertierung
        """
        try:
            source_path = Path(source_path)
            target_dir = Path(target_dir)
            target_dir.mkdir(parents=True, exist_ok=True)
            
            # Standardmetadaten erstellen
            metadata = metadata or {}
            
            # Zieldateinamen generieren
            target_filename = self._generate_target_filename(source_path, metadata)
            target_path = target_dir / target_filename
            
            self.logger.info(f"Konvertiere {source_path} nach {target_path}")
            
            # Dokument konvertieren (implementiert von den Unterklassen)
            markdown_content, extracted_metadata = self._convert_to_markdown(source_path)
            
            # Metadaten aktualisieren
            updated_metadata = {**metadata, **extracted_metadata}
            
            # Frontmatter erstellen
            frontmatter = self._create_frontmatter(updated_metadata)
            
            # Markdown-Dokument mit Frontmatter speichern
            self._save_markdown_document(target_path, frontmatter, markdown_content)
            
            # Konvertierungsinformationen zurückgeben
            return {
                'source': str(source_path),
                'target': str(target_path),
                'success': True,
                'metadata': updated_metadata
            }
            
        except Exception as e:
            self.logger.error(f"Fehler bei der Konvertierung von {source_path}: {e}", exc_info=True)
            return {
                'source': str(source_path),
                'target': '',
                'success': False,
                'error': str(e)
            }
    
    @abstractmethod
    def _convert_to_markdown(self, source_path: Path) -> tuple[str, Dict[str, Any]]:
        """
        Konvertiert die Quelldatei in Markdown. Muss von Unterklassen implementiert werden.
        
        Args:
            source_path: Pfad zur Quelldatei
            
        Returns:
            Tuple aus (markdown_content, metadata)
        """
        pass
    
    def _generate_target_filename(self, source_path: Path, metadata: Dict[str, Any]) -> str:
        """
        Generiert einen geeigneten Dateinamen für die Zieldatei.
        
        Args:
            source_path: Pfad zur Quelldatei
            metadata: Metadaten des Dokuments
            
        Returns:
            Dateiname für die Zieldatei
        """
        # Verwende den Titel aus den Metadaten, falls vorhanden
        if metadata and 'title' in metadata and metadata['title']:
            # Bereinige den Titel für die Verwendung als Dateiname
            base_name = self._sanitize_filename(metadata['title'])
        else:
            # Verwende andernfalls den Dateinamen ohne Erweiterung
            base_name = source_path.stem
        
        # Füge Dateiendung hinzu
        return f"{base_name}.md"
    
    def _sanitize_filename(self, filename: str) -> str:
        """
        Bereinigt einen String für die Verwendung als Dateiname.
        
        Args:
            filename: Der zu bereinigende String
            
        Returns:
            Bereinigter Dateiname
        """
        # Entferne ungültige Zeichen
        filename = re.sub(r'[^\w\s-]', '', filename)
        # Ersetze Leerzeichen durch Unterstriche
        filename = re.sub(r'\s+', '_', filename)
        # Kürze auf maximal 100 Zeichen
        return filename[:100].lower()
    
    def _create_frontmatter(self, metadata: Dict[str, Any]) -> str:
        """
        Erstellt das YAML-Frontmatter für die Markdown-Datei.
        
        Args:
            metadata: Metadaten für das Frontmatter
            
        Returns:
            YAML-Frontmatter als String
        """
        # Lade die Vorlage, falls vorhanden
        frontmatter_template = {}
        if self.frontmatter_template_path.exists():
            with open(self.frontmatter_template_path, 'r', encoding='utf-8') as f:
                frontmatter_template = yaml.safe_load(f) or {}
        
        # Kombiniere Vorlage mit Metadaten
        frontmatter_data = {**frontmatter_template, **metadata}
        
        # Filtere Nichtskalar-Werte heraus, die YAML-Probleme verursachen könnten
        filtered_data = {}
        for key, value in frontmatter_data.items():
            if isinstance(value, (str, int, float, bool)) or value is None:
                filtered_data[key] = value
        
        # Konvertiere in YAML
        yaml_str = yaml.dump(filtered_data, default_flow_style=False, allow_unicode=True)
        
        # Füge YAML-Trennzeichen hinzu
        return f"---\n{yaml_str}---\n\n"
    
    def _save_markdown_document(self, target_path: Path, frontmatter: str, markdown_content: str) -> None:
        """
        Speichert das konvertierte Markdown-Dokument mit Frontmatter.
        
        Args:
            target_path: Zieldateipfad
            frontmatter: YAML-Frontmatter
            markdown_content: Markdown-Inhalt
        """
        with open(target_path, 'w', encoding='utf-8') as f:
            f.write(frontmatter)
            f.write(markdown_content)
        
        self.logger.info(f"Dokument erfolgreich gespeichert: {target_path}")
    
    def _copy_assets(self, source_dir: Path, assets: Dict[str, Path], target_dir: Path) -> Dict[str, Path]:
        """
        Kopiert Assets (Bilder, etc.) in ein Zielverzeichnis und gibt aktualisierte Pfade zurück.
        
        Args:
            source_dir: Quellverzeichnis
            assets: Dictionary mit Asset-Namen und relativen Pfaden
            target_dir: Zielverzeichnis
            
        Returns:
            Dictionary mit aktualisierten Asset-Pfaden
        """
        # Erstelle das Assets-Verzeichnis, falls es nicht existiert
        assets_dir = target_dir / "assets"
        assets_dir.mkdir(parents=True, exist_ok=True)
        
        updated_assets = {}
        
        for name, rel_path in assets.items():
            try:
                # Absoluten Quellpfad erstellen
                source_path = source_dir / rel_path
                
                # Zieldateiname generieren
                target_filename = f"{self._sanitize_filename(name)}{rel_path.suffix}"
                target_path = assets_dir / target_filename
                
                # Asset kopieren
                shutil.copy2(source_path, target_path)
                
                # Aktualisiere den Pfad im Dictionary
                updated_assets[name] = Path("assets") / target_filename
                
                self.logger.info(f"Asset kopiert: {source_path} -> {target_path}")
                
            except Exception as e:
                self.logger.error(f"Fehler beim Kopieren des Assets {name}: {e}")
                # Behalte den alten Pfad bei
                updated_assets[name] = rel_path
        
        return updated_assets