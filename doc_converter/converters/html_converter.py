"""
HTML-Konverter für die Dokumentenkonvertierungspipeline.
Konvertiert HTML-Dokumente in strukturierte Markdown-Dateien.
"""

import os
import re
from pathlib import Path
import logging
from typing import Dict, Any, List, Tuple, Optional
import html2text
import requests
import bs4
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

from .base_converter import BaseConverter

class HTMLConverter(BaseConverter):
    """Konvertiert HTML-Dokumente in strukturierte Markdown-Dateien"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialisiert den HTML-Konverter.
        
        Args:
            config: Konfigurationswörterbuch mit Konvertereinstellungen
        """
        super().__init__(config)
        
        # HTML-spezifische Konfiguration
        self.extract_images = self.config.get('extract_images', True)
        self.download_remote_images = self.config.get('download_remote_images', False)
        self.max_image_size = self.config.get('max_image_size', 1024)  # Max. Bildbreite oder -höhe in Pixeln
        self.extract_metadata = self.config.get('extract_metadata', True)
        self.extract_links = self.config.get('extract_links', True)
        self.remove_scripts = self.config.get('remove_scripts', True)
        self.main_content_selectors = self.config.get('main_content_selectors', [
            'main', 'article', '.content', '#content', '.main-content', '#main-content',
            '.post-content', '.entry-content', '.article-content', '.page-content'
        ])
    
    def _convert_to_markdown(self, source_path: Path) -> Tuple[str, Dict[str, Any]]:
        """
        Konvertiert eine HTML-Datei in Markdown.
        
        Args:
            source_path: Pfad zur HTML-Datei
            
        Returns:
            Tuple aus (markdown_content, metadata)
        """
        self.logger.info(f"Starte Konvertierung von HTML: {source_path}")
        
        try:
            # Lade den HTML-Inhalt
            with open(source_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # Parse HTML mit BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extrahiere Metadaten
            metadata = self._extract_html_metadata(soup, source_path)
            
            # Bereinige HTML
            cleaned_html = self._preprocess_html(soup, source_path)
            
            # Konvertiere zu Markdown
            markdown_content = self._html_to_markdown(cleaned_html)
            
            # Nachbearbeitung des Markdown
            markdown_content = self._postprocess_markdown(markdown_content)
            
            self.logger.info(f"HTML-Konvertierung abgeschlossen: {len(markdown_content)} Zeichen")
            
            return markdown_content, metadata
            
        except Exception as e:
            self.logger.error(f"Fehler bei der HTML-Konvertierung: {e}", exc_info=True)
            return f"# Konvertierung fehlgeschlagen\n\nFehler: {str(e)}", {
                'title': source_path.stem,
                'original_format': 'HTML',
                'error': f"Fehler bei der Konvertierung: {str(e)}"
            }
    
    def _extract_html_metadata(self, soup: BeautifulSoup, source_path: Path) -> Dict[str, Any]:
        """
        Extrahiert Metadaten aus dem HTML-Dokument.
        
        Args:
            soup: BeautifulSoup-Objekt des HTML-Dokuments
            source_path: Pfad zur HTML-Datei
            
        Returns:
            Dictionary mit Metadaten
        """
        metadata = {
            'title': source_path.stem,
            'original_format': 'HTML',
            'has_images': bool(soup.find_all('img')),
            'has_tables': bool(soup.find_all('table')),
            'has_links': bool(soup.find_all('a'))
        }
        
        # Extrahiere <title>
        title_tag = soup.find('title')
        if title_tag and title_tag.string:
            metadata['title'] = title_tag.string.strip()
        
        # Extrahiere <meta>-Tags
        if self.extract_metadata:
            # Spezifische Meta-Tags mit definierter Semantik
            meta_mappings = {
                'description': ['description', 'og:description'],
                'author': ['author', 'og:author', 'article:author'],
                'keywords': ['keywords'],
                'created': ['article:published_time', 'datePublished', 'date'],
                'modified': ['article:modified_time', 'dateModified'],
                'publisher': ['publisher', 'og:site_name'],
                'language': ['language', 'og:locale'],
                'robots': ['robots']
            }
            
            for field, possible_meta_names in meta_mappings.items():
                for name in possible_meta_names:
                    # Suche nach name= Attribut
                    meta_tag = soup.find('meta', attrs={'name': name})
                    if not meta_tag:
                        # Suche nach property= Attribut (für OpenGraph-Tags)
                        meta_tag = soup.find('meta', attrs={'property': name})
                    
                    if meta_tag:
                        content = meta_tag.get('content', '').strip()
                        if content:
                            metadata[field] = content
                            break
        
        return metadata
    
    def _preprocess_html(self, soup: BeautifulSoup, source_path: Path) -> str:
        """
        Bereinigt und preprocessiert das HTML für bessere Konvertierung.
        
        Args:
            soup: BeautifulSoup-Objekt des HTML-Dokuments
            source_path: Pfad zur HTML-Datei
            
        Returns:
            Bereinigtes HTML als String
        """
        # Entferne unerwünschte Elemente
        if self.remove_scripts:
            for script in soup.find_all(['script', 'style', 'iframe']):
                script.decompose()
        
        # Verarbeite Bilder
        if self.extract_images:
            self._process_images(soup, source_path)
        
        # Verarbeite Links
        if self.extract_links:
            self._process_links(soup, source_path)
        
        # Versuche, den Hauptinhalt zu extrahieren
        main_content = self._extract_main_content(soup)
        if main_content:
            # Wenn Hauptinhalt gefunden wurde, verwende nur diesen Teil
            return str(main_content)
        else:
            # Andernfalls das gesamte HTML verwenden (nur body, falls vorhanden)
            body = soup.body
            return str(body) if body else str(soup)
    
    def _extract_main_content(self, soup: BeautifulSoup) -> Optional[bs4.element.Tag]:
        """
        Versucht, den Hauptinhalt aus dem HTML zu extrahieren.
        
        Args:
            soup: BeautifulSoup-Objekt des HTML-Dokuments
            
        Returns:
            BeautifulSoup-Tag des Hauptinhalts oder None, wenn nicht gefunden
        """
        # Versuche, den Hauptinhalt mit verschiedenen Selektoren zu finden
        for selector in self.main_content_selectors:
            content = soup.select_one(selector)
            if content and len(content.get_text(strip=True)) > 100:
                return content
        
        # Versuche, den Hauptinhalt heuristisch zu finden (den längsten Textblock)
        candidates = []
        for container in soup.find_all(['div', 'article', 'section']):
            text_length = len(container.get_text(strip=True))
            if text_length > 200:  # Ignoriere zu kurze Container
                candidates.append((container, text_length))
        
        if candidates:
            # Sortiere nach Textlänge und nimm den längsten
            return sorted(candidates, key=lambda x: x[1], reverse=True)[0][0]
        
        return None
    
    def _process_images(self, soup: BeautifulSoup, source_path: Path) -> None:
        """
        Verarbeitet Bilder im HTML-Dokument.
        
        Args:
            soup: BeautifulSoup-Objekt des HTML-Dokuments
            source_path: Pfad zur HTML-Datei
        """
        assets_dir = source_path.parent / 'assets'
        assets_dir.mkdir(parents=True, exist_ok=True)
        
        for i, img in enumerate(soup.find_all('img')):
            try:
                img_src = img.get('src', '')
                if not img_src:
                    continue
                
                alt_text = img.get('alt', f'Bild {i+1}')
                
                # Versuche, lokale Bilder zu verarbeiten
                if not img_src.startswith(('http://', 'https://')):
                    # Lokaler Pfad, überprüfe ob absolut oder relativ
                    if img_src.startswith('/'):
                        # Absoluter Pfad vom Document Root, nicht unterstützt
                        img_path = None
                    else:
                        # Relativer Pfad zur HTML-Datei
                        img_path = source_path.parent / img_src
                    
                    if img_path and img_path.exists():
                        # Kopiere Bild ins Assets-Verzeichnis
                        new_filename = f"image_{i+1}{img_path.suffix}"
                        new_path = assets_dir / new_filename
                        
                        try:
                            import shutil
                            shutil.copy2(img_path, new_path)
                            # Aktualisiere das src-Attribut
                            img['src'] = f"assets/{new_filename}"
                        except Exception as e:
                            self.logger.warning(f"Fehler beim Kopieren des Bildes {img_src}: {e}")
                    else:
                        # Bild existiert nicht lokal
                        img['src'] = f"[Fehlendes Bild: {img_src}]"
                
                # Verarbeite Remote-Bilder, wenn erlaubt
                elif self.download_remote_images:
                    try:
                        # Bestimme Dateierweiterung aus URL
                        parsed_url = urlparse(img_src)
                        img_ext = os.path.splitext(parsed_url.path)[1]
                        if not img_ext:
                            img_ext = '.jpg'  # Standardwert
                        
                        # Generiere Dateiname
                        new_filename = f"image_{i+1}{img_ext}"
                        new_path = assets_dir / new_filename
                        
                        # Lade Bild herunter
                        response = requests.get(img_src, timeout=10)
                        if response.status_code == 200:
                            with open(new_path, 'wb') as f:
                                f.write(response.content)
                            # Aktualisiere das src-Attribut
                            img['src'] = f"assets/{new_filename}"
                        else:
                            # Bild konnte nicht heruntergeladen werden
                            img['src'] = f"[Nicht herunterladbares Bild: {img_src}]"
                    except Exception as e:
                        self.logger.warning(f"Fehler beim Herunterladen des Bildes {img_src}: {e}")
                        img['src'] = f"[Fehler beim Herunterladen: {img_src}]"
            
            except Exception as e:
                self.logger.warning(f"Fehler bei der Verarbeitung des Bildes {i+1}: {e}")
    
    def _process_links(self, soup: BeautifulSoup, source_path: Path) -> None:
        """
        Verarbeitet Links im HTML-Dokument.
        
        Args:
            soup: BeautifulSoup-Objekt des HTML-Dokuments
            source_path: Pfad zur HTML-Datei
        """
        base_url = ""
        base_tag = soup.find('base')
        if base_tag and base_tag.get('href'):
            base_url = base_tag.get('href')
        
        for a in soup.find_all('a'):
            href = a.get('href', '')
            if not href:
                continue
            
            # Verarbeite relative URLs
            if not href.startswith(('http://', 'https://', 'mailto:', 'tel:', '#')):
                if base_url:
                    # Kombiniere mit Base-URL
                    full_url = urljoin(base_url, href)
                    a['href'] = full_url
                    a['title'] = f"Externe URL: {full_url}"
                else:
                    # Markiere als lokale Referenz
                    a['title'] = f"Lokale Referenz: {href}"
            
            # Füge Hinweise für externe Links hinzu
            elif href.startswith(('http://', 'https://')):
                a['title'] = f"Externe URL: {href}"
                
                # Optional: Füge Icon oder Text für externe Links hinzu
                if not a.string or a.string.strip() == href:
                    a.string = f"{a.string or href} 🔗"
    
    def _html_to_markdown(self, html: str) -> str:
        """
        Konvertiert HTML zu Markdown mithilfe von html2text.
        
        Args:
            html: HTML-String
            
        Returns:
            Markdown-String
        """
        # Konfiguriere html2text
        h2t = html2text.HTML2Text()
        h2t.ignore_links = False
        h2t.ignore_images = False
        h2t.ignore_tables = False
        h2t.ignore_emphasis = False
        h2t.body_width = 0  # Keine Zeilenumbrüche einfügen
        h2t.protect_links = True  # URLs in Links erhalten
        h2t.unicode_snob = True  # Unicode-Zeichen behalten
        h2t.wrap_links = False  # Links nicht umbrechen
        h2t.single_line_break = True  # Einzelne Zeilenumbrüche behalten
        
        # Konvertiere HTML zu Markdown
        markdown = h2t.handle(html)
        
        return markdown
    
    def _postprocess_markdown(self, markdown: str) -> str:
        """
        Nachbearbeitung des Markdown-Texts.
        
        Args:
            markdown: Roher Markdown-Text
            
        Returns:
            Bereinigter und optimierter Markdown-Text
        """
        # Bereinige mehrfache Leerzeilen
        markdown = re.sub(r'\n{3,}', '\n\n', markdown)
        
        # Entferne überflüssige Escapes
        markdown = re.sub(r'\\([^\\])', r'\1', markdown)
        
        # Korrigiere Überschriften (Leerzeichen nach # einfügen)
        markdown = re.sub(r'(#{1,6})([^ #])', r'\1 \2', markdown)
        
        # Korrigiere häufige html2text Probleme mit Listen
        markdown = re.sub(r'\n\* \*\*', r'\n* **', markdown)  # Verschachtelte Listen korrigieren
        
        # Korrigiere leere Tabellenzellen
        markdown = re.sub(r'\|\s+\|', '|  |', markdown)
        
        # Füge Überschrift hinzu, wenn keine vorhanden ist
        if not re.search(r'^#', markdown):
            metadata_title = self.frontmatter_template_path.exists() and yaml.safe_load(open(self.frontmatter_template_path, 'r', encoding='utf-8')).get('title', '')
            title = metadata_title or "Konvertiertes HTML-Dokument"
            markdown = f"# {title}\n\n{markdown}"
        
        return markdown


if __name__ == "__main__":
    # Setup Logging
    logging.basicConfig(level=logging.INFO, 
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Test des HTML-Konverters
    import sys
    
    if len(sys.argv) > 1:
        html_path = sys.argv[1]
        target_dir = sys.argv[2] if len(sys.argv) > 2 else "output"
        
        converter = HTMLConverter()
        result = converter.convert(html_path, target_dir)
        
        if result['success']:
            print(f"Konvertierung erfolgreich: {result['target']}")
        else:
            print(f"Fehler bei der Konvertierung: {result.get('error', 'Unbekannter Fehler')}")
    else:
        print("Verwendung: python html_converter.py <html_datei> [ziel_verzeichnis]")