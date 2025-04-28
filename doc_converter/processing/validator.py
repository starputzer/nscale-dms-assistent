"""
Markdown-Validator für die Dokumentenkonvertierungspipeline.
Validiert konvertierte Markdown-Dokumente und identifiziert Probleme.
"""

import os
import re
import json
import yaml
from pathlib import Path
import logging
from typing import Dict, Any, List, Tuple, Optional, Set
import markdown
from markdown.extensions import Extension

class MarkdownValidator:
    """Validiert konvertierte Markdown-Dateien und identifiziert Probleme"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialisiert den Markdown-Validator.
        
        Args:
            config: Konfigurationswörterbuch mit Validierungseinstellungen
        """
        self.logger = logging.getLogger(__name__)
        self.config = config or {}
        
        # Lade Regeln aus Konfiguration
        self.rules_path = self.config.get('markdown_rules', 'doc_converter/config/markdown_rules.json')
        self.rules = self._load_rules()
        
        # Validierungsoptionen
        self.min_content_length = self.config.get('min_content_length', 100)
        self.max_content_length = self.config.get('max_content_length', 1000000)
        self.max_line_length = self.config.get('max_line_length', 120)
        self.required_sections = self.config.get('required_sections', [])
        self.check_broken_links = self.config.get('check_broken_links', True)
        self.check_images = self.config.get('check_images', True)
        self.check_frontmatter = self.config.get('check_frontmatter', True)
        self.check_heading_hierarchy = self.config.get('check_heading_hierarchy', True)
    
    def _load_rules(self) -> Dict[str, Any]:
        """
        Lädt Validierungsregeln aus der Konfigurationsdatei.
        
        Returns:
            Dictionary mit Validierungsregeln
        """
        default_rules = {
            "structure": {
                "required_frontmatter": ["title", "original_format"],
                "heading_hierarchy": True,
                "allowed_heading_jumps": 1,
                "max_heading_level": 6
            },
            "content": {
                "min_length": 100,
                "max_length": 1000000,
                "min_headings": 1,
                "min_paragraphs": 2,
                "required_sections": []
            },
            "formatting": {
                "max_line_length": 120,
                "code_block_style": "fenced",
                "emphasis_style": "asterisk",
                "list_item_style": "consistent"
            },
            "links": {
                "require_link_texts": True,
                "prefer_relative_asset_links": True,
                "asset_folder": "assets"
            },
            "tables": {
                "require_headers": True,
                "require_alignment_row": True,
                "max_columns": 10
            }
        }
        
        try:
            # Prüfe, ob die Regeldatei existiert
            rules_path = Path(self.rules_path)
            if rules_path.exists():
                with open(rules_path, 'r', encoding='utf-8') as f:
                    custom_rules = json.load(f)
                
                # Kombiniere mit Standardregeln
                for category, rules in custom_rules.items():
                    if category in default_rules:
                        default_rules[category].update(rules)
                    else:
                        default_rules[category] = rules
                
                self.logger.info(f"Regeln geladen aus {rules_path}")
            else:
                self.logger.warning(f"Regeldatei {rules_path} nicht gefunden, verwende Standardregeln")
        
        except Exception as e:
            self.logger.error(f"Fehler beim Laden der Validierungsregeln: {e}")
        
        return default_rules
    
    def validate(self, markdown_path: Path) -> Dict[str, Any]:
        """
        Validiert eine Markdown-Datei gegen die konfigurierten Regeln.
        
        Args:
            markdown_path: Pfad zur Markdown-Datei
            
        Returns:
            Validierungsergebnis mit Problemen und Empfehlungen
        """
        if not markdown_path.exists():
            return {
                'is_valid': False,
                'issues': [f"Datei existiert nicht: {markdown_path}"],
                'warnings': [],
                'stats': {}
            }
        
        try:
            # Lese Markdown-Datei
            with open(markdown_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Sammle Validierungsergebnisse
            issues = []
            warnings = []
            stats = self._collect_stats(content, markdown_path)
            
            # Validiere grundlegende Struktur
            structure_issues, structure_warnings = self._validate_structure(content, markdown_path)
            issues.extend(structure_issues)
            warnings.extend(structure_warnings)
            
            # Validiere Inhalt
            content_issues, content_warnings = self._validate_content(content, stats)
            issues.extend(content_issues)
            warnings.extend(content_warnings)
            
            # Validiere Formatierung
            format_issues, format_warnings = self._validate_formatting(content)
            issues.extend(format_issues)
            warnings.extend(format_warnings)
            
            # Validiere Links und Bilder
            link_issues, link_warnings = self._validate_links(content, markdown_path)
            issues.extend(link_issues)
            warnings.extend(link_warnings)
            
            # Validiere Tabellen
            table_issues, table_warnings = self._validate_tables(content)
            issues.extend(table_issues)
            warnings.extend(table_warnings)
            
            # Bestimme Gesamtergebnis
            is_valid = len(issues) == 0
            
            return {
                'is_valid': is_valid,
                'issues': issues,
                'warnings': warnings,
                'stats': stats
            }
        
        except Exception as e:
            self.logger.error(f"Fehler bei der Validierung von {markdown_path}: {e}", exc_info=True)
            return {
                'is_valid': False,
                'issues': [f"Validierungsfehler: {str(e)}"],
                'warnings': [],
                'stats': {}
            }
    
    def _collect_stats(self, content: str, markdown_path: Path) -> Dict[str, Any]:
        """
        Sammelt Statistiken über den Markdown-Inhalt.
        
        Args:
            content: Markdown-Inhalt
            markdown_path: Pfad zur Markdown-Datei
            
        Returns:
            Dictionary mit Statistiken
        """
        # Extrahiere Frontmatter, falls vorhanden
        frontmatter, markdown_text = self._extract_frontmatter(content)
        
        # Zähle Zeilen, Zeichen und Wörter
        lines = markdown_text.split('\n')
        char_count = len(markdown_text)
        word_count = len(re.findall(r'\b\w+\b', markdown_text))
        
        # Zähle Überschriften nach Ebene
        headings = {
            'h1': len(re.findall(r'^# .+$', markdown_text, re.MULTILINE)),
            'h2': len(re.findall(r'^## .+$', markdown_text, re.MULTILINE)),
            'h3': len(re.findall(r'^### .+$', markdown_text, re.MULTILINE)),
            'h4': len(re.findall(r'^#### .+$', markdown_text, re.MULTILINE)),
            'h5': len(re.findall(r'^##### .+$', markdown_text, re.MULTILINE)),
            'h6': len(re.findall(r'^###### .+$', markdown_text, re.MULTILINE))
        }
        total_headings = sum(headings.values())
        
        # Zähle Absätze
        paragraphs = len(re.findall(r'\n\n(?!#|\s*\*|\s*\d+\.|\s*>|\s*```|\s*\|)', markdown_text))
        
        # Zähle Links und Bilder
        links = len(re.findall(r'\[.+?\]\(.+?\)', markdown_text))
        images = len(re.findall(r'!\[.+?\]\(.+?\)', markdown_text))
        
        # Zähle Codeblöcke
        code_blocks = len(re.findall(r'```[\s\S]*?```', markdown_text))
        
        # Zähle Tabellen
        tables = len(re.findall(r'\|.+\|.+\n\|[-:| ]+\|', markdown_text))
        
        # Zähle Listen
        unordered_lists = len(re.findall(r'(?:^|\n)[ \t]*\*[ \t]+', markdown_text))
        ordered_lists = len(re.findall(r'(?:^|\n)[ \t]*\d+\.[ \t]+', markdown_text))
        
        # Zähle Blockzitate
        blockquotes = len(re.findall(r'(?:^|\n)[ \t]*>[ \t]+', markdown_text))
        
        # Erstelle Statistik-Dictionary
        return {
            'file_name': markdown_path.name,
            'file_size': markdown_path.stat().st_size,
            'char_count': char_count,
            'word_count': word_count,
            'line_count': len(lines),
            'headings': headings,
            'total_headings': total_headings,
            'paragraphs': paragraphs,
            'links': links,
            'images': images,
            'code_blocks': code_blocks,
            'tables': tables,
            'unordered_lists': unordered_lists,
            'ordered_lists': ordered_lists,
            'blockquotes': blockquotes,
            'has_frontmatter': bool(frontmatter)
        }
    
    def _extract_frontmatter(self, content: str) -> Tuple[Dict[str, Any], str]:
        """
        Extrahiert das YAML-Frontmatter aus dem Markdown-Inhalt.
        
        Args:
            content: Markdown-Inhalt
            
        Returns:
            Tuple aus (frontmatter_dict, content_without_frontmatter)
        """
        frontmatter_pattern = r'^---\s*\n(.*?)\n---\s*\n'
        frontmatter_match = re.match(frontmatter_pattern, content, re.DOTALL)
        
        if frontmatter_match:
            try:
                # Extrahiere und parse YAML
                frontmatter_yaml = frontmatter_match.group(1)
                frontmatter = yaml.safe_load(frontmatter_yaml)
                
                # Entferne Frontmatter aus Inhalt
                content_without_frontmatter = content[frontmatter_match.end():]
                
                return frontmatter or {}, content_without_frontmatter
            except Exception as e:
                self.logger.warning(f"Fehler beim Parsen des Frontmatter: {e}")
        
        # Wenn kein Frontmatter gefunden wurde oder ein Fehler auftrat
        return {}, content
    
    def _validate_structure(self, content: str, markdown_path: Path) -> Tuple[List[str], List[str]]:
        """
        Validiert die Struktur der Markdown-Datei.
        
        Args:
            content: Markdown-Inhalt
            markdown_path: Pfad zur Markdown-Datei
            
        Returns:
            Tuple aus (issues, warnings)
        """
        issues = []
        warnings = []
        
        # Extrahiere Frontmatter
        frontmatter, markdown_text = self._extract_frontmatter(content)
        
        # Validiere Frontmatter, falls aktiviert
        if self.check_frontmatter:
            # Prüfe ob Frontmatter existiert
            if not frontmatter and self.rules['structure'].get('required_frontmatter'):
                issues.append("Fehlendes Frontmatter")
            
            # Prüfe ob erforderliche Felder vorhanden sind
            required_fields = self.rules['structure'].get('required_frontmatter', [])
            for field in required_fields:
                if field not in frontmatter:
                    issues.append(f"Fehlendes erforderliches Frontmatter-Feld: {field}")
        
        # Validiere Überschriftenhierarchie, falls aktiviert
        if self.check_heading_hierarchy:
            heading_issues = self._validate_heading_hierarchy(markdown_text)
            issues.extend(heading_issues)
        
        # Validiere Existenz von Überschriften
        heading_match = re.search(r'^#+ .+$', markdown_text, re.MULTILINE)
        if not heading_match:
            issues.append("Keine Überschrift im Dokument gefunden")
        
        # Prüfe auf leeres Dokument
        if not markdown_text.strip():
            issues.append("Leeres Dokument")
        
        # Prüfe auf potenzielle Kodierungsprobleme
        if '�' in markdown_text:
            warnings.append("Mögliche Kodierungsprobleme (unbekannte Zeichen '�' gefunden)")
        
        return issues, warnings
    
    def _validate_heading_hierarchy(self, markdown_text: str) -> List[str]:
        """
        Validiert die Hierarchie der Überschriften.
        
        Args:
            markdown_text: Markdown-Inhalt ohne Frontmatter
            
        Returns:
            Liste der Probleme
        """
        issues = []
        
        # Extrahiere alle Überschriften mit ihren Ebenen
        heading_pattern = r'^(#+) (.+)$'
        headings = re.findall(heading_pattern, markdown_text, re.MULTILINE)
        
        if not headings:
            return []  # Keine Überschriften zu validieren
        
        # Prüfe Hierarchie
        max_heading_level = self.rules['structure'].get('max_heading_level', 6)
        allowed_jumps = self.rules['structure'].get('allowed_heading_jumps', 1)
        
        prev_level = None
        for i, (hashes, text) in enumerate(headings):
            level = len(hashes)
            
            # Prüfe auf zu tiefe Überschriftenebene
            if level > max_heading_level:
                issues.append(f"Überschrift zu tief (Ebene {level} > {max_heading_level}): '{text}'")
            
            # Prüfe auf Sprünge in der Hierarchie
            if prev_level is not None:
                if level > prev_level + allowed_jumps:
                    issues.append(f"Zu großer Sprung in der Überschriftenhierarchie (von h{prev_level} zu h{level}): '{text}'")
            
            prev_level = level
        
        # Prüfe auf mehrere h1-Überschriften
        h1_count = sum(1 for hashes, _ in headings if len(hashes) == 1)
        if h1_count > 1 and self.rules['structure'].get('single_h1', True):
            issues.append(f"Mehrere h1-Überschriften gefunden ({h1_count})")
        
        return issues
    
    def _validate_content(self, content: str, stats: Dict[str, Any]) -> Tuple[List[str], List[str]]:
        """
        Validiert den Inhalt der Markdown-Datei.
        
        Args:
            content: Markdown-Inhalt
            stats: Statistiken über den Inhalt
            
        Returns:
            Tuple aus (issues, warnings)
        """
        issues = []
        warnings = []
        
        # Extrahiere Inhalt ohne Frontmatter
        _, markdown_text = self._extract_frontmatter(content)
        
        # Prüfe Mindestlänge
        min_content_length = self.rules['content'].get('min_length', self.min_content_length)
        if len(markdown_text) < min_content_length:
            issues.append(f"Inhalt zu kurz ({len(markdown_text)} < {min_content_length} Zeichen)")
        
        # Prüfe Maximallänge
        max_content_length = self.rules['content'].get('max_length', self.max_content_length)
        if len(markdown_text) > max_content_length:
            issues.append(f"Inhalt zu lang ({len(markdown_text)} > {max_content_length} Zeichen)")
        
        # Prüfe Mindestanzahl an Überschriften
        min_headings = self.rules['content'].get('min_headings', 1)
        if stats['total_headings'] < min_headings:
            issues.append(f"Zu wenige Überschriften ({stats['total_headings']} < {min_headings})")
        
        # Prüfe Mindestanzahl an Absätzen
        min_paragraphs = self.rules['content'].get('min_paragraphs', 2)
        if stats['paragraphs'] < min_paragraphs:
            issues.append(f"Zu wenige Absätze ({stats['paragraphs']} < {min_paragraphs})")
        
        # Prüfe erforderliche Abschnitte
        required_sections = self.rules['content'].get('required_sections', [])
        for section in required_sections:
            if not re.search(rf'^#+\s+{re.escape(section)}\s*$', markdown_text, re.MULTILINE | re.IGNORECASE):
                issues.append(f"Fehlender erforderlicher Abschnitt: '{section}'")
        
        # Prüfe auf potenzielle Formatierungsprobleme
        if re.search(r'(\*\*\*|\*\*|\*)[^*\s].*[^*\s](\*\*\*|\*\*|\*)', markdown_text):
            warnings.append("Mögliche Formatierungsprobleme mit Markdown-Hervorhebungen gefunden")
        
        # Prüfe auf leere Abschnitte
        empty_section_pattern = r'^(#+)\s+(.+?)\s*\n+(?=#+|$)'
        for match in re.finditer(empty_section_pattern, markdown_text, re.MULTILINE):
            heading_level = len(match.group(1))
            heading_text = match.group(2)
            warnings.append(f"Leerer Abschnitt: h{heading_level} '{heading_text}'")
        
        # Prüfe auf sehr kurze Abschnitte
        short_section_content = r'^(#+)\s+(.+?)\s*\n+(.{1,50})\s*\n+(?=#+|$)'
        for match in re.finditer(short_section_content, markdown_text, re.MULTILINE):
            heading_level = len(match.group(1))
            heading_text = match.group(2)
            warnings.append(f"Sehr kurzer Abschnitt: h{heading_level} '{heading_text}'")
        
        return issues, warnings
    
    def _validate_formatting(self, content: str) -> Tuple[List[str], List[str]]:
        """
        Validiert die Formatierung der Markdown-Datei.
        
        Args:
            content: Markdown-Inhalt
            
        Returns:
            Tuple aus (issues, warnings)
        """
        issues = []
        warnings = []
        
        # Extrahiere Inhalt ohne Frontmatter
        _, markdown_text = self._extract_frontmatter(content)
        
        # Prüfe Zeilenlänge
        max_line_length = self.rules['formatting'].get('max_line_length', self.max_line_length)
        for i, line in enumerate(markdown_text.split('\n')):
            # Ignoriere Codeblöcke und Tabellen bei der Zeilenlängenprüfung
            if line.startswith('```') or line.startswith('|'):
                continue
                
            if len(line) > max_line_length:
                warnings.append(f"Zeile {i+1} zu lang ({len(line)} > {max_line_length} Zeichen)")
        
        # Prüfe Codeblock-Stil
        code_block_style = self.rules['formatting'].get('code_block_style', 'fenced')
        if code_block_style == 'fenced':
            # Prüfe auf Indentation-Codeblöcke (die mit 4 Leerzeichen beginnen)
            indented_code_blocks = re.findall(r'(?:^|\n)    [^\s]', markdown_text)
            if indented_code_blocks:
                warnings.append(f"Eingerückte Codeblöcke gefunden ({len(indented_code_blocks)}), bevorzuge aber Fenced-Codeblöcke (```)")
        
        # Prüfe Hervorhebungsstil
        emphasis_style = self.rules['formatting'].get('emphasis_style', 'asterisk')
        if emphasis_style == 'asterisk':
            # Prüfe auf Underscore-Hervorhebungen
            underscore_emphasis = re.findall(r'(?<!\w)_[^_]+_(?!\w)', markdown_text)
            if underscore_emphasis:
                warnings.append(f"Underscore-Hervorhebungen gefunden ({len(underscore_emphasis)}), bevorzuge aber Asterisk-Hervorhebungen (*)")
        
        # Prüfe Listenelement-Stil
        list_item_style = self.rules['formatting'].get('list_item_style', 'consistent')
        if list_item_style == 'consistent':
            # Prüfe auf unterschiedliche Listenformate
            dash_items = re.findall(r'(?:^|\n)[ \t]*-[ \t]+', markdown_text)
            asterisk_items = re.findall(r'(?:^|\n)[ \t]*\*[ \t]+', markdown_text)
            plus_items = re.findall(r'(?:^|\n)[ \t]*\+[ \t]+', markdown_text)
            
            list_styles_used = sum(1 for items in [dash_items, asterisk_items, plus_items] if items)
            if list_styles_used > 1:
                warnings.append(f"Inkonsistente Aufzählungszeichen verwendet (-, *, +), bevorzuge eine konsistente Formatierung")
        
        # Prüfe HTML-Nutzung
        html_tags = re.findall(r'<(/?)(\w+)[^>]*>', markdown_text)
        if html_tags:
            warnings.append(f"HTML-Tags im Markdown gefunden ({len(html_tags)}), bevorzuge reine Markdown-Syntax")
        
        return issues, warnings
    
    def _validate_links(self, content: str, markdown_path: Path) -> Tuple[List[str], List[str]]:
        """
        Validiert Links und Bilder in der Markdown-Datei.
        
        Args:
            content: Markdown-Inhalt
            markdown_path: Pfad zur Markdown-Datei
            
        Returns:
            Tuple aus (issues, warnings)
        """
        issues = []
        warnings = []
        
        # Extrahiere Inhalt ohne Frontmatter
        _, markdown_text = self._extract_frontmatter(content)
        
        # Prüfe auf toten Links (nur lokale Dateien)
        if self.check_broken_links:
            link_pattern = r'\[([^\]]*)\]\(([^)]+)\)'
            for match in re.finditer(link_pattern, markdown_text):
                link_text = match.group(1)
                link_url = match.group(2)
                
                # Ignoriere externe URLs, Anker und leere Links
                if link_url.startswith(('http://', 'https://', 'mailto:', 'tel:', '#')) or not link_url.strip():
                    continue
                
                # Überprüfe lokale Dateien
                try:
                    if not link_url.startswith('/'):
                        target_path = markdown_path.parent / link_url
                        if not target_path.exists():
                            issues.append(f"Toter Link zu nicht existierender Datei: {link_url}")
                except Exception as e:
                    warnings.append(f"Fehler beim Überprüfen des Links {link_url}: {e}")
            
        # Prüfe auf leere Link-Texte
        if self.rules['links'].get('require_link_texts', True):
            empty_link_texts = re.findall(r'\[\s*\]\(([^)]+)\)', markdown_text)
            if empty_link_texts:
                for url in empty_link_texts:
                    issues.append(f"Leerer Link-Text für URL: {url}")
        
        # Prüfe Bildpfade
        if self.check_images:
            image_pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
            for match in re.finditer(image_pattern, markdown_text):
                alt_text = match.group(1)
                image_url = match.group(2)
                
                # Ignoriere externe URLs
                if image_url.startswith(('http://', 'https://')):
                    continue
                
                # Überprüfe lokale Dateien
                try:
                    if not image_url.startswith('/'):
                        target_path = markdown_path.parent / image_url
                        if not target_path.exists():
                            issues.append(f"Fehlendes Bild: {image_url}")
                except Exception as e:
                    warnings.append(f"Fehler beim Überprüfen des Bildes {image_url}: {e}")
                
                # Prüfe auf leere Alt-Texte
                if not alt_text.strip():
                    warnings.append(f"Leerer Alt-Text für Bild: {image_url}")
        
        # Prüfe relative Asset-Links
        asset_folder = self.rules['links'].get('asset_folder', 'assets')
        prefer_relative = self.rules['links'].get('prefer_relative_asset_links', True)
        
        if prefer_relative and asset_folder:
            absolute_asset_paths = re.findall(rf'[!]?\[[^\]]*\]\(/{asset_folder}/[^)]+\)', markdown_text)
            if absolute_asset_paths:
                warnings.append(f"Absolute Asset-Pfade gefunden ({len(absolute_asset_paths)}), bevorzuge relative Pfade")
        
        return issues, warnings
    
    def _validate_tables(self, content: str) -> Tuple[List[str], List[str]]:
        """
        Validiert Tabellen in der Markdown-Datei.
        
        Args:
            content: Markdown-Inhalt
            
        Returns:
            Tuple aus (issues, warnings)
        """
        issues = []
        warnings = []
        
        # Extrahiere Inhalt ohne Frontmatter
        _, markdown_text = self._extract_frontmatter(content)
        
        # Finde alle Tabellen
        table_pattern = r'(?:^|\n)(\|.+?\|)(?:\s*\n\|[-:| ]+\|(?:\s*\n\|.+?\|)*)?'
        tables = re.findall(table_pattern, markdown_text, re.DOTALL)
        
        for i, table_start in enumerate(tables):
            # Extrahiere die vollständige Tabelle
            table_match = re.search(rf'(?:^|\n)({re.escape(table_start)}(?:\s*\n\|[-:| ]+\|(?:\s*\n\|.+?\|)*)?)', markdown_text, re.DOTALL)
            if not table_match:
                continue
                
            table = table_match.group(1)
            table_lines = table.strip().split('\n')
            
            # Prüfe, ob die Tabelle einen Header hat
            if len(table_lines) >= 2 and self.rules['tables'].get('require_headers', True):
                header_row = table_lines[0]
                delimiter_row = table_lines[1] if len(table_lines) > 1 else ""
                
                # Prüfe, ob die zweite Zeile tatsächlich eine Trenner-Zeile ist
                if not re.match(r'^\|[-:| ]+\|, delimiter_row):
                    issues.append(f"Tabelle {i+1} hat keine Kopf-Trenner-Zeile (erwartet: |---| Zeile)")
            
            # Prüfe maximale Spaltenanzahl
            max_columns = self.rules['tables'].get('max_columns', 10)
            for line in table_lines:
                columns_count = line.count('|') - 1  # Zähle Spalten (Anzahl | minus 1)
                if columns_count > max_columns:
                    warnings.append(f"Tabelle {i+1} hat zu viele Spalten ({columns_count} > {max_columns})")
                    break
            
            # Prüfe auf inkonsistente Spaltenanzahl
            column_counts = [line.count('|') - 1 for line in table_lines]
            if len(set(column_counts)) > 1:
                issues.append(f"Tabelle {i+1} hat inkonsistente Spaltenanzahl")
            
            # Prüfe auf sehr lange Tabellen (nur Warnung)
            if len(table_lines) > 20:
                warnings.append(f"Tabelle {i+1} ist sehr lang ({len(table_lines)} Zeilen)")
            
            # Prüfe auf sehr breite Zellen
            for line in table_lines:
                cells = line.strip('|').split('|')
                for j, cell in enumerate(cells):
                    if len(cell.strip()) > 50:
                        warnings.append(f"Tabelle {i+1} hat sehr breite Zelle in Spalte {j+1} ({len(cell.strip())} Zeichen)")
        
        return issues, warnings


# Test-Code, wenn das Skript direkt ausgeführt wird
if __name__ == "__main__":
    # Setup Logging
    logging.basicConfig(level=logging.INFO, 
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    import sys
    
    if len(sys.argv) > 1:
        markdown_path = Path(sys.argv[1])
        
        validator = MarkdownValidator()
        result = validator.validate(markdown_path)
        
        print(f"\nValidierung von {markdown_path}:")
        print(f"Gültig: {'JA' if result['is_valid'] else 'NEIN'}")
        
        if result['issues']:
            print("\nProbleme:")
            for issue in result['issues']:
                print(f" - {issue}")
        
        if result['warnings']:
            print("\nWarnungen:")
            for warning in result['warnings']:
                print(f" - {warning}")
        
        print("\nStatistiken:")
        for key, value in result['stats'].items():
            if isinstance(value, dict):
                print(f" - {key}:")
                for subkey, subvalue in value.items():
                    print(f"   - {subkey}: {subvalue}")
            else:
                print(f" - {key}: {value}")
    else:
        print("Verwendung: python validator.py <markdown_datei>")