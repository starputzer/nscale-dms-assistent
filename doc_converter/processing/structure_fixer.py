"""
Struktur-Fixer für die Dokumentenkonvertierungspipeline.
Verbessert die Struktur konvertierter Markdown-Dateien.
"""

import os
import re
import yaml
from pathlib import Path
import logging
import json
from typing import Dict, Any, List, Tuple, Optional, Set
import nltk
from nltk.tokenize import sent_tokenize

# Versuche NLTK-Daten zu laden (für Satzgrenzen-Erkennung)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    try:
        nltk.download('punkt', quiet=True)
    except:
        pass  # Stille Fehlerbehandlung, falls keine Internetverbindung verfügbar ist

class StructureFixer:
    """Verbessert die Struktur von konvertierten Markdown-Dateien"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialisiert den Struktur-Fixer.
        
        Args:
            config: Konfigurationswörterbuch mit Struktur-Fixer-Einstellungen
        """
        self.logger = logging.getLogger(__name__)
        self.config = config or {}
        
        # Lade Struktur-Regeln
        self.rules_path = self.config.get('structure_rules', 'doc_converter/config/structure_rules.json')
        self.rules = self._load_rules()
        
        # Optionen
        self.fix_heading_hierarchy = self.config.get('fix_heading_hierarchy', True)
        self.fix_heading_levels = self.config.get('fix_heading_levels', True)
        self.fix_heading_capitalize = self.config.get('fix_heading_capitalize', True)
        self.fix_paragraph_breaks = self.config.get('fix_paragraph_breaks', True)
        self.fix_list_formatting = self.config.get('fix_list_formatting', True)
        self.create_missing_sections = self.config.get('create_missing_sections', False)
        self.min_section_length = self.config.get('min_section_length', 100)
        self.max_section_length = self.config.get('max_section_length', 3000)
        self.improve_frontmatter = self.config.get('improve_frontmatter', True)
    
    def _load_rules(self) -> Dict[str, Any]:
        """
        Lädt Strukturregeln aus der Konfigurationsdatei.
        
        Returns:
            Dictionary mit Strukturregeln
        """
        default_rules = {
            "heading_hierarchy": {
                "enabled": True,
                "max_level": 4,
                "allowed_skips": 0,
                "top_level_heading": 1  # h1 als höchste Ebene
            },
            "heading_structure": {
                "required_sections": [],
                "section_order": [],
                "auto_capitalize": "title"  # 'title', 'sentence', 'none'
            },
            "paragraph_structure": {
                "min_paragraph_length": 40,
                "max_paragraph_length": 600,
                "sentence_per_line": False,
                "ensure_blank_lines": True
            },
            "lists": {
                "ensure_blank_lines": True,
                "standard_marker": "*",
                "increase_indentation": True
            },
            "document_template": {
                "enabled": False,
                "template_file": "",
                "sections": {}
            },
            "frontmatter": {
                "ensure_required_fields": ["title", "original_format"],
                "auto_generate_missing": True,
                "field_ordering": ["title", "author", "original_format", "created", "modified"]
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
                
                self.logger.info(f"Struktur-Regeln geladen aus {rules_path}")
            else:
                self.logger.warning(f"Regeldatei {rules_path} nicht gefunden, verwende Standardregeln")
        
        except Exception as e:
            self.logger.error(f"Fehler beim Laden der Struktur-Regeln: {e}")
        
        return default_rules
    
    def improve_structure(self, markdown_path: Path, output_path: Optional[Path] = None) -> Dict[str, Any]:
        """
        Verbessert die Struktur einer Markdown-Datei.
        
        Args:
            markdown_path: Pfad zur Markdown-Datei
            output_path: Pfad für die strukturierte Datei (falls nicht angegeben, wird die Originaldatei überschrieben)
            
        Returns:
            Dictionary mit Informationen über die Strukturverbesserungen
        """
        if not markdown_path.exists():
            return {
                'success': False,
                'error': f"Datei existiert nicht: {markdown_path}",
                'changes': []
            }
        
        try:
            # Lese Markdown-Datei
            with open(markdown_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extrahiere Frontmatter und Inhalt
            frontmatter, markdown_text = self._extract_frontmatter(content)
            
            # Führe Strukturverbesserungen durch
            improved_text, changes = self._improve_structure(markdown_text)
            
            # Verbessere Frontmatter, falls aktiviert
            if self.improve_frontmatter:
                frontmatter, frontmatter_changes = self._improve_frontmatter(frontmatter, markdown_text, markdown_path)
                if frontmatter_changes:
                    changes.extend(frontmatter_changes)
            
            # Zusammenführen von Frontmatter und verbessertem Text
            frontmatter_yaml = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
            final_content = f"---\n{frontmatter_yaml}---\n\n{improved_text}"
            
            # Speichere das Ergebnis
            if output_path is None:
                output_path = markdown_path
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_content)
            
            self.logger.info(f"Markdown-Struktur erfolgreich verbessert: {output_path}")
            
            return {
                'success': True,
                'source': str(markdown_path),
                'target': str(output_path),
                'changes': changes
            }
            
        except Exception as e:
            self.logger.error(f"Fehler bei der Strukturverbesserung von {markdown_path}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'changes': []
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
    
    def _improve_structure(self, markdown_text: str) -> Tuple[str, List[str]]:
        """
        Führt alle Strukturverbesserungen am Markdown-Text durch.
        
        Args:
            markdown_text: Markdown-Inhalt ohne Frontmatter
            
        Returns:
            Tuple aus (verbesserter_text, liste_der_änderungen)
        """
        changes = []
        improved_text = markdown_text
        
        # 1. Korrigiere Überschriftenhierarchie
        if self.fix_heading_hierarchy:
            new_text, heading_changes = self._fix_heading_hierarchy(improved_text)
            if new_text != improved_text:
                improved_text = new_text
                changes.extend(heading_changes)
        
        # 2. Korrigiere Überschriftsebenen (Title Case)
        if self.fix_heading_capitalize:
            new_text, capitalize_changes = self._fix_heading_capitalize(improved_text)
            if new_text != improved_text:
                improved_text = new_text
                changes.extend(capitalize_changes)
        
        # 3. Korrigiere Absatzumbrüche
        if self.fix_paragraph_breaks:
            new_text, paragraph_changes = self._fix_paragraph_breaks(improved_text)
            if new_text != improved_text:
                improved_text = new_text
                changes.extend(paragraph_changes)
        
        # 4. Korrigiere Listenformatierung
        if self.fix_list_formatting:
            new_text, list_changes = self._fix_list_formatting(improved_text)
            if new_text != improved_text:
                improved_text = new_text
                changes.extend(list_changes)
        
        # 5. Erstelle fehlende Abschnitte
        if self.create_missing_sections:
            new_text, section_changes = self._create_missing_sections(improved_text)
            if new_text != improved_text:
                improved_text = new_text
                changes.extend(section_changes)
        
        return improved_text, changes
    
    def _fix_heading_hierarchy(self, text: str) -> Tuple[str, List[str]]:
        """
        Korrigiert die Hierarchie der Überschriften im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        
        # Extrahiere alle Überschriften mit ihren Ebenen
        heading_pattern = r'^(#+) (.+)$'
        headings = list(re.finditer(heading_pattern, text, re.MULTILINE))
        
        if not headings:
            return text, []  # Keine Überschriften zu korrigieren
        
        # Extrahiere die Hierarchie-Einstellungen
        hierarchy_settings = self.rules.get('heading_hierarchy', {})
        max_level = hierarchy_settings.get('max_level', 4)
        allowed_skips = hierarchy_settings.get('allowed_skips', 0)
        top_level = hierarchy_settings.get('top_level_heading', 1)
        
        # Analysiere die aktuelle Hierarchie
        current_levels = [(h.group(1), h.group(2), h.start(), h.end()) for h in headings]
        min_current_level = min(len(level) for level, _, _, _ in current_levels)
        
        # Wenn die oberste Ebene nicht der gewünschten top_level entspricht, korrigiere die gesamte Hierarchie
        level_offset = top_level - min_current_level
        
        if level_offset != 0 or any(len(level) > max_level for level, _, _, _ in current_levels):
            # Bereite Änderungen vor
            corrections = []
            
            for level, title, start, end in current_levels:
                current_level = len(level)
                
                # Berechne die neue Ebene
                new_level = current_level + level_offset
                
                # Stelle sicher, dass die Ebene nicht über max_level hinausgeht
                if new_level > max_level:
                    new_level = max_level
                
                # Erstelle neue Überschrift
                new_heading = f"{'#' * new_level} {title}"
                
                # Speichere Änderung
                corrections.append((start, end, new_heading))
            
            # Wende Änderungen an (von hinten nach vorne, um Indizes stabil zu halten)
            result_text = text
            for start, end, new_heading in sorted(corrections, reverse=True):
                result_text = result_text[:start] + new_heading + result_text[end:]
            
            # Füge Änderungsbeschreibung hinzu
            if level_offset != 0:
                changes.append(f"Überschriftenhierarchie um {abs(level_offset)} {'erhöht' if level_offset > 0 else 'verringert'}")
            
            if any(len(level) > max_level for level, _, _, _ in current_levels):
                changes.append(f"Überschriftsebenen auf maximal {max_level} begrenzt")
            
            return result_text, changes
        
        # Prüfe auf Lücken in der Hierarchie und korrigiere sie
        if allowed_skips == 0:
            # Extrahiere die Überschriften erneut aus dem Text, falls Änderungen vorgenommen wurden
            headings = list(re.finditer(heading_pattern, text, re.MULTILINE))
            current_levels = [(len(h.group(1)), h.group(2), h.start(), h.end()) for h in headings]
            
            # Finde Lücken in der Hierarchie
            gaps = []
            prev_level = None
            
            for i, (level, title, start, end) in enumerate(current_levels):
                if prev_level is not None and level > prev_level + 1:
                    # Lücke gefunden
                    gaps.append((i, level, prev_level))
                prev_level = level
            
            if gaps:
                # Bereite Korrekturen vor
                corrections = []
                
                for i, level, prev_level in gaps:
                    # Korrigiere die Ebene, um keine Lücken zu haben
                    new_level = prev_level + 1
                    title = current_levels[i][1]
                    start = current_levels[i][2]
                    end = current_levels[i][3]
                    
                    # Erstelle neue Überschrift
                    new_heading = f"{'#' * new_level} {title}"
                    
                    # Speichere Änderung
                    corrections.append((start, end, new_heading))
                
                # Wende Änderungen an (von hinten nach vorne)
                result_text = text
                for start, end, new_heading in sorted(corrections, reverse=True):
                    result_text = result_text[:start] + new_heading + result_text[end:]
                
                changes.append(f"Lücken in der Überschriftenhierarchie korrigiert ({len(gaps)} Korrekturen)")
                
                return result_text, changes
        
        return text, changes
    
    def _fix_heading_capitalize(self, text: str) -> Tuple[str, List[str]]:
        """
        Korrigiert die Großschreibung von Überschriften im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        
        # Hole Kapitalisierungseinstellung
        heading_structure = self.rules.get('heading_structure', {})
        capitalize_mode = heading_structure.get('auto_capitalize', 'title')
        
        if capitalize_mode == 'none':
            return text, []  # Keine Änderungen erforderlich
        
        # Extrahiere alle Überschriften
        heading_pattern = r'^(#+) (.+)$'
        
        def title_case(title):
            """Konvertiert Text in Title Case (jedes Wort groß)"""
            # Liste der Kleinwörter, die nicht großgeschrieben werden sollen (außer am Anfang)
            small_words = {'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'von', 'zu', 'in', 'im', 'an', 'am', 'für'}
            
            words = title.split(' ')
            result = []
            
            for i, word in enumerate(words):
                if i == 0 or word.lower() not in small_words:
                    result.append(word.capitalize())
                else:
                    result.append(word.lower())
            
            return ' '.join(result)
        
        def sentence_case(title):
            """Konvertiert Text in Sentence Case (nur erster Buchstabe groß)"""
            if not title:
                return title
            return title[0].upper() + title[1:]
        
        def process_match(match):
            hashes = match.group(1)
            title = match.group(2)
            
            # Wende entsprechende Formatierung an
            if capitalize_mode == 'title':
                new_title = title_case(title)
            elif capitalize_mode == 'sentence':
                new_title = sentence_case(title)
            else:
                return match.group(0)  # Keine Änderung
            
            # Wenn sich der Titel geändert hat
            if new_title != title:
                return f"{hashes} {new_title}"
            else:
                return match.group(0)
        
        new_text, count = re.subn(heading_pattern, process_match, text, flags=re.MULTILINE)
        
        if count > 0 and new_text != text:
            changes.append(f"Großschreibung bei {count} Überschriften korrigiert (Modus: {capitalize_mode})")
        
        return new_text, changes
    
    def _fix_paragraph_breaks(self, text: str) -> Tuple[str, List[str]]:
        """
        Korrigiert Absatzumbrüche im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        
        # Hole Absatzeinstellungen
        paragraph_structure = self.rules.get('paragraph_structure', {})
        min_paragraph_length = paragraph_structure.get('min_paragraph_length', 40)
        max_paragraph_length = paragraph_structure.get('max_paragraph_length', 600)
        sentence_per_line = paragraph_structure.get('sentence_per_line', False)
        ensure_blank_lines = paragraph_structure.get('ensure_blank_lines', True)
        
        # Identifiziere Absätze (Text zwischen Überschriften, Listen, etc.)
        # Um Absätze zu finden, suchen wir nach Textblöcken, die keine speziellen Markdown-Elemente sind
        special_elements_pattern = r'^(?:#+\s+.*|\s*[-*+]\s+.*|\s*\d+\.\s+.*|\s*>\s+.*|```[\s\S]*?```|\|.*\|.*|\!\[.*\]\(.*\)|\[.*\]\(.*\))'
        
        # Teile den Text in Zeilen auf und finde Absätze
        lines = text.split('\n')
        paragraphs = []
        current_paragraph = []
        
        for line in lines:
            # Wenn die Zeile ein spezielles Element ist oder leer ist
            if re.match(special_elements_pattern, line) or not line.strip():
                # Schließe den aktuellen Absatz ab, falls vorhanden
                if current_paragraph:
                    paragraphs.append(('\n'.join(current_paragraph), len(lines) - len(current_paragraph)))
                    current_paragraph = []
                
                # Speichere die spezielle Zeile als eigenen "Absatz"
                if line:
                    paragraphs.append((line, len(paragraphs)))
            else:
                # Füge die Zeile zum aktuellen Absatz hinzu
                current_paragraph.append(line)
        
        # Letzten Absatz hinzufügen, falls vorhanden
        if current_paragraph:
            paragraphs.append(('\n'.join(current_paragraph), len(lines) - len(current_paragraph)))
        
        # Verarbeite jeden Absatz
        paragraph_changes = 0
        blank_line_changes = 0
        result_lines = []
        
        for paragraph, _ in paragraphs:
            # Wenn es ein normaler Textabsatz ist (kein spezielles Element)
            if not re.match(special_elements_pattern, paragraph):
                # Absatz in Sätze aufteilen, falls sentence_per_line aktiviert ist
                if sentence_per_line:
                    try:
                        sentences = sent_tokenize(paragraph)
                        result_lines.extend(sentences)
                        paragraph_changes += 1
                    except:
                        # Fallback, wenn NLTK-Tokenizer nicht verfügbar ist
                        simple_sentences = re.split(r'(?<=[.!?])\s+', paragraph)
                        result_lines.extend(simple_sentences)
                        paragraph_changes += 1
                else:
                    # Prüfe, ob der Absatz zu lang ist und teile ihn ggf. auf
                    if len(paragraph) > max_paragraph_length:
                        # Versuche, den Absatz an Satzgrenzen aufzuteilen
                        try:
                            sentences = sent_tokenize(paragraph)
                            current_length = 0
                            current_paragraph = []
                            
                            for sentence in sentences:
                                if current_length + len(sentence) > max_paragraph_length and current_paragraph:
                                    # Füge den aktuellen Teil-Absatz hinzu
                                    result_lines.append(' '.join(current_paragraph))
                                    current_paragraph = [sentence]
                                    current_length = len(sentence)
                                else:
                                    current_paragraph.append(sentence)
                                    current_length += len(sentence)
                            
                            # Füge den letzten Teil-Absatz hinzu, falls vorhanden
                            if current_paragraph:
                                result_lines.append(' '.join(current_paragraph))
                            
                            paragraph_changes += 1
                        except:
                            # Fallback, wenn NLTK-Tokenizer nicht verfügbar ist
                            result_lines.append(paragraph)
                    else:
                        result_lines.append(paragraph)
            else:
                # Spezielle Elemente unverändert übernehmen
                result_lines.append(paragraph)
        
        # Füge Leerzeilen zwischen Absätzen ein, falls gewünscht
        if ensure_blank_lines:
            final_lines = []
            
            for i, line in enumerate(result_lines):
                # Prüfe, ob es sich um einen Absatzanfang handelt
                is_paragraph_start = not re.match(special_elements_pattern, line) and (i == 0 or re.match(special_elements_pattern, result_lines[i-1]))
                
                # Füge Leerzeile ein, falls erforderlich
                if is_paragraph_start and i > 0 and final_lines and final_lines[-1] != '':
                    final_lines.append('')
                    blank_line_changes += 1
                
                final_lines.append(line)
                
                # Füge Leerzeile nach dem Absatz ein, falls erforderlich
                is_paragraph_end = not re.match(special_elements_pattern, line) and (i == len(result_lines) - 1 or re.match(special_elements_pattern, result_lines[i+1]))
                
                if is_paragraph_end and i < len(result_lines) - 1:
                    final_lines.append('')
                    blank_line_changes += 1
        else:
            final_lines = result_lines
        
        # Entferne aufeinanderfolgende Leerzeilen
        i = 0
        while i < len(final_lines) - 1:
            if final_lines[i] == '' and final_lines[i+1] == '':
                final_lines.pop(i)
                blank_line_changes += 1
            else:
                i += 1
        
        # Erstelle den Ergebnistext
        result_text = '\n'.join(final_lines)
        
        # Füge Änderungsbeschreibungen hinzu
        if paragraph_changes > 0:
            changes.append(f"{paragraph_changes} Absätze umstrukturiert" + (" (ein Satz pro Zeile)" if sentence_per_line else ""))
        
        if blank_line_changes > 0:
            changes.append(f"{blank_line_changes} Leerzeilen zwischen Absätzen korrigiert")
        
        return result_text, changes
    
    def _fix_list_formatting(self, text: str) -> Tuple[str, List[str]]:
        """
        Korrigiert Listenformatierung im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        
        # Hole Listeneinstellungen
        list_settings = self.rules.get('lists', {})
        ensure_blank_lines = list_settings.get('ensure_blank_lines', True)
        standard_marker = list_settings.get('standard_marker', '*')
        increase_indentation = list_settings.get('increase_indentation', True)
        
        # Standardisiere Aufzählungszeichen
        if standard_marker in ['*', '-', '+']:
            # Ersetze alle verschiedenen Aufzählungszeichen durch das konfigurierte
            list_marker_pattern = r'^(\s*)([*\-+])(\s+)(.+)$'
            
            def standardize_marker(match):
                indent = match.group(1)
                marker = match.group(2)
                space = match.group(3)
                content = match.group(4)
                
                # Wenn das Aufzählungszeichen bereits richtig ist
                if marker == standard_marker:
                    return match.group(0)
                else:
                    return f"{indent}{standard_marker}{space}{content}"
            
            new_text, marker_count = re.subn(list_marker_pattern, standardize_marker, text, flags=re.MULTILINE)
            
            if marker_count > 0 and new_text != text:
                changes.append(f"{marker_count} Listenmarkierungen standardisiert zu '{standard_marker}'")
                text = new_text
        
        # Erhöhe die Einrückung für verschachtelte Listen, falls aktiviert
        if increase_indentation:
            list_indent_pattern = r'^(\s*)([*\-+]|\d+\.)(\s+)(.+)$'
            
            # Finde alle Listenelemente und ihre Einrückungsebenen
            list_items = list(re.finditer(list_indent_pattern, text, re.MULTILINE))
            
            if list_items:
                # Gruppiere nach Einrückungsebenen
                indent_levels = {}
                
                for item in list_items:
                    indent = item.group(1)
                    indent_len = len(indent)
                    
                    if indent_len not in indent_levels:
                        indent_levels[indent_len] = []
                    
                    indent_levels[indent_len].append(item)
                
                # Sortiere Einrückungsebenen
                sorted_levels = sorted(indent_levels.keys())
                
                # Wenn mehrere Ebenen vorhanden sind, prüfe, ob die Einrückung korrekt ist
                if len(sorted_levels) > 1:
                    # Überprüfe, ob die Einrückungsschritte konsistent sind
                    for i in range(1, len(sorted_levels)):
                        prev_level = sorted_levels[i-1]
                        curr_level = sorted_levels[i]
                        
                        # Wenn der Einrückungsschritt zu klein ist (weniger als 2 Leerzeichen)
                        if curr_level - prev_level < 2:
                            # Bereite Korrekturen vor
                            corrections = []
                            
                            for level in sorted_levels[i:]:
                                for item in indent_levels[level]:
                                    start, end = item.span()
                                    original = item.group(0)
                                    
                                    # Berechne neue Einrückung
                                    new_indent_len = prev_level + (level - prev_level) * 2
                                    new_indent = ' ' * new_indent_len
                                    
                                    marker = item.group(2)
                                    space = item.group(3)
                                    content = item.group(4)
                                    
                                    # Erstelle neues Listenelement
                                    new_item = f"{new_indent}{marker}{space}{content}"
                                    
                                    # Speichere Korrektur
                                    corrections.append((start, end, new_item))
                            
                            # Wende Korrekturen an (von hinten nach vorne)
                            result_text = text
                            for start, end, new_item in sorted(corrections, reverse=True):
                                result_text = result_text[:start] + new_item + result_text[end:]
                            
                            changes.append(f"Listeneinrückung korrigiert ({len(corrections)} Änderungen)")
                            text = result_text
        
        # Stelle sicher, dass Listen durch Leerzeilen umgeben sind
        if ensure_blank_lines:
            # Finde den Anfang und das Ende von Listen
            list_start_pattern = r'(?:^|\n\n)(\s*(?:[*\-+]|\d+\.)\s+.+)$'
            list_items = re.findall(r'^(\s*(?:[*\-+]|\d+\.)\s+.+)$', text, re.MULTILINE)
            
            if list_items:
                # Finde Listen im Text
                list_blocks = []
                current_block = []
                lines = text.split('\n')
                
                for i, line in enumerate(lines):
                    if re.match(r'^\s*(?:[*\-+]|\d+\.)\s+', line):
                        # Listenelement
                        if not current_block:
                            # Neuer Listenblock
                            list_blocks.append((i, []))
                        current_block = list_blocks[-1][1]
                        current_block.append(i)
                    elif line.strip() == '' and current_block:
                        # Leerzeile beendet den aktuellen Block
                        current_block = []
                
                # Verarbeite jeden Listenblock
                new_lines = lines.copy()
                modifications = 0
                
                for start_idx, block_indices in list_blocks:
                    if not block_indices:
                        continue
                    
                    # Prüfe, ob vor dem Block eine Leerzeile ist
                    if start_idx > 0 and new_lines[start_idx - 1].strip() != '':
                        new_lines.insert(start_idx, '')
                        # Aktualisiere nachfolgende Indizes
                        block_indices = [idx + 1 for idx in block_indices]
                        modifications += 1
                    
                    # Prüfe, ob nach dem Block eine Leerzeile ist
                    end_idx = block_indices[-1]
                    if end_idx < len(new_lines) - 1 and new_lines[end_idx + 1].strip() != '':
                        new_lines.insert(end_idx + 1, '')
                        modifications += 1
                
                if modifications > 0:
                    changes.append(f"{modifications} Leerzeilen um Listen herum eingefügt")
                    text = '\n'.join(new_lines)
        
        return text, changes
    
    def _create_missing_sections(self, text: str) -> Tuple[str, List[str]]:
        """
        Erstellt fehlende Abschnitte basierend auf den konfigurierten Regeln.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        
        # Hole Abschnittseinstellungen
        heading_structure = self.rules.get('heading_structure', {})
        required_sections = heading_structure.get('required_sections', [])
        section_order = heading_structure.get('section_order', [])
        
        if not required_sections:
            return text, []  # Keine Änderungen erforderlich
        
        # Finde vorhandene Abschnitte
        heading_pattern = r'^(#+)\s+(.+)$'
        headings = list(re.finditer(heading_pattern, text, re.MULTILINE))
        
        existing_sections = [h.group(2).strip() for h in headings]
        existing_sections_lower = [s.lower() for s in existing_sections]
        
        # Finde fehlende Abschnitte
        missing_sections = []
        for section in required_sections:
            if section.lower() not in existing_sections_lower:
                missing_sections.append(section)
        
        if not missing_sections:
            return text, []  # Keine fehlenden Abschnitte
        
        # Erstelle fehlende Abschnitte
        level = 2  # Standardebene für neue Abschnitte
        
        # Bestimme Ebene basierend auf vorhandenen Überschriften
        if headings:
            level_counts = {}
            for h in headings:
                heading_level = len(h.group(1))
                if heading_level not in level_counts:
                    level_counts[heading_level] = 0
                level_counts[heading_level] += 1
            
            # Verwende die häufigste Ebene für Abschnitte
            if level_counts:
                level = max(level_counts.items(), key=lambda x: x[1])[0]
        
        # Füge fehlende Abschnitte hinzu
        result_text = text
        
        # Wenn eine Abschnittsreihenfolge definiert ist, füge die Abschnitte in der richtigen Reihenfolge ein
        if section_order:
            # Finde Positionen für jede Überschrift
            positions = {}
            for i, h in enumerate(headings):
                heading_title = h.group(2).strip()
                positions[heading_title.lower()] = i
            
            # Für jede fehlende Überschrift, finde die richtige Position
            for section in missing_sections:
                section_lower = section.lower()
                
                # Finde Position in der Reihenfolge
                try:
                    order_index = [s.lower() for s in section_order].index(section_lower)
                except ValueError:
                    # Wenn nicht in der Reihenfolge, füge am Ende hinzu
                    result_text += f"\n\n{'#' * level} {section}\n\nFügen Sie hier Inhalte für '{section}' ein.\n"
                    changes.append(f"Abschnitt '{section}' am Ende hinzugefügt")
                    continue
                
                # Finde die nächsthöhere Überschrift in der Reihenfolge
                insert_after = None
                insert_before = None
                
                for i in range(order_index - 1, -1, -1):
                    # Suche nach einer vorhandenen Überschrift vor dieser
                    if section_order[i].lower() in positions:
                        insert_after = section_order[i].lower()
                        break
                
                for i in range(order_index + 1, len(section_order)):
                    # Suche nach einer vorhandenen Überschrift nach dieser
                    if section_order[i].lower() in positions:
                        insert_before = section_order[i].lower()
                        break
                
                # Entscheide, wo der Abschnitt eingefügt werden soll
                if insert_after is not None:
                    # Finde die Position nach der Überschrift
                    after_index = positions[insert_after]
                    after_heading = headings[after_index]
                    
                    # Finde den Text nach der Überschrift bis zur nächsten Überschrift
                    if after_index < len(headings) - 1:
                        next_heading = headings[after_index + 1]
                        content_end = next_heading.start()
                    else:
                        content_end = len(text)
                    
                    content_start = after_heading.end()
                    
                    # Füge den neuen Abschnitt am Ende des vorherigen ein
                    new_section = f"\n\n{'#' * level} {section}\n\nFügen Sie hier Inhalte für '{section}' ein.\n"
                    result_text = result_text[:content_end] + new_section + result_text[content_end:]
                    
                    changes.append(f"Abschnitt '{section}' nach '{section_order[order_index-1]}' hinzugefügt")
                elif insert_before is not None:
                    # Finde die Position vor der Überschrift
                    before_index = positions[insert_before]
                    before_heading = headings[before_index]
                    
                    # Füge den neuen Abschnitt vor dem nächsten ein
                    new_section = f"{'#' * level} {section}\n\nFügen Sie hier Inhalte für '{section}' ein.\n\n"
                    result_text = result_text[:before_heading.start()] + new_section + result_text[before_heading.start():]
                    
                    changes.append(f"Abschnitt '{section}' vor '{section_order[order_index+1]}' hinzugefügt")
                else:
                    # Wenn keine Bezugspunkte gefunden wurden, füge am Ende hinzu
                    result_text += f"\n\n{'#' * level} {section}\n\nFügen Sie hier Inhalte für '{section}' ein.\n"
                    changes.append(f"Abschnitt '{section}' am Ende hinzugefügt")
        else:
            # Ohne definierte Reihenfolge, füge alle fehlenden Abschnitte am Ende hinzu
            for section in missing_sections:
                result_text += f"\n\n{'#' * level} {section}\n\nFügen Sie hier Inhalte für '{section}' ein.\n"
            
            changes.append(f"{len(missing_sections)} fehlende Abschnitte am Ende hinzugefügt")
        
        return result_text, changes
    
    def _improve_frontmatter(self, frontmatter: Dict[str, Any], markdown_text: str, file_path: Path) -> Tuple[Dict[str, Any], List[str]]:
        """
        Verbessert das Frontmatter basierend auf dem Inhalt und den Regeln.
        
        Args:
            frontmatter: Frontmatter-Dictionary
            markdown_text: Markdown-Text ohne Frontmatter
            file_path: Pfad zur Markdown-Datei
            
        Returns:
            Tuple aus (verbessertes_frontmatter, änderungen)
        """
        changes = []
        updated_frontmatter = frontmatter.copy()
        
        # Hole Frontmatter-Einstellungen
        frontmatter_settings = self.rules.get('frontmatter', {})
        required_fields = frontmatter_settings.get('ensure_required_fields', ['title', 'original_format'])
        auto_generate = frontmatter_settings.get('auto_generate_missing', True)
        field_ordering = frontmatter_settings.get('field_ordering', [])
        
        # Prüfe und füge fehlende Felder hinzu
        missing_fields = [field for field in required_fields if field not in updated_frontmatter]
        
        if missing_fields and auto_generate:
            for field in missing_fields:
                if field == 'title':
                    # Extrahiere Titel aus der ersten Überschrift oder aus dem Dateinamen
                    heading_match = re.search(r'^#\s+(.+)$', markdown_text, re.MULTILINE)
                    if heading_match:
                        title = heading_match.group(1).strip()
                    else:
                        title = file_path.stem.replace('_', ' ').replace('-', ' ').title()
                    
                    updated_frontmatter['title'] = title
                    changes.append(f"Frontmatter: 'title' aus der ersten Überschrift/Dateinamen generiert")
                
                elif field == 'original_format':
                    # Versuche, das Originalformat basierend auf vorhandenen Informationen zu bestimmen
                    if 'source_path' in updated_frontmatter:
                        source_path = Path(updated_frontmatter['source_path'])
                        ext = source_path.suffix.lower()
                        if ext in ['.pdf', '.docx', '.xlsx', '.pptx', '.html']:
                            format_name = {
                                '.pdf': 'PDF',
                                '.docx': 'DOCX',
                                '.xlsx': 'XLSX',
                                '.pptx': 'PPTX',
                                '.html': 'HTML'
                            }.get(ext, ext[1:].upper())
                            
                            updated_frontmatter['original_format'] = format_name
                            changes.append(f"Frontmatter: 'original_format' aus dem Quelldatei-Pfad generiert")
                        else:
                            updated_frontmatter['original_format'] = 'Markdown'
                            changes.append(f"Frontmatter: 'original_format' als 'Markdown' gesetzt")
                    else:
                        updated_frontmatter['original_format'] = 'Markdown'
                        changes.append(f"Frontmatter: 'original_format' als 'Markdown' gesetzt")
                
                elif field == 'author':
                    # Setze einen Standardautor, falls nicht angegeben
                    updated_frontmatter['author'] = 'Automatisch konvertiert'
                    changes.append(f"Frontmatter: Standardwert für 'author' gesetzt")
                
                elif field == 'created' or field == 'date':
                    # Verwende die Dateierstellungszeit oder aktuelle Zeit
                    from datetime import datetime
                    try:
                        created_time = datetime.fromtimestamp(file_path.stat().st_ctime)
                        updated_frontmatter[field] = created_time.strftime('%Y-%m-%d')
                        changes.append(f"Frontmatter: '{field}' aus der Dateierstellungszeit generiert")
                    except:
                        # Fallback zur aktuellen Zeit
                        updated_frontmatter[field] = datetime.now().strftime('%Y-%m-%d')
                        changes.append(f"Frontmatter: '{field}' auf aktuelle Zeit gesetzt")
                
                elif field == 'modified':
                    # Verwende die Dateierstellungszeit oder aktuelle Zeit
                    from datetime import datetime
                    try:
                        modified_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                        updated_frontmatter[field] = modified_time.strftime('%Y-%m-%d')
                        changes.append(f"Frontmatter: '{field}' aus der Dateiänderungszeit generiert")
                    except:
                        # Fallback zur aktuellen Zeit
                        updated_frontmatter[field] = datetime.now().strftime('%Y-%m-%d')
                        changes.append(f"Frontmatter: '{field}' auf aktuelle Zeit gesetzt")
        
        # Sortiere die Felder nach der Reihenfolge, falls angegeben
        if field_ordering:
            ordered_frontmatter = {}
            
            # Füge Felder in der angegebenen Reihenfolge hinzu
            for field in field_ordering:
                if field in updated_frontmatter:
                    ordered_frontmatter[field] = updated_frontmatter[field]
            
            # Füge verbleibende Felder hinzu
            for field, value in updated_frontmatter.items():
                if field not in ordered_frontmatter:
                    ordered_frontmatter[field] = value
            
            if ordered_frontmatter != updated_frontmatter:
                changes.append(f"Frontmatter: Felder nach konfigurierter Reihenfolge sortiert")
                updated_frontmatter = ordered_frontmatter
        
        return updated_frontmatter, changes


if __name__ == "__main__":
    # Setup Logging
    logging.basicConfig(level=logging.INFO, 
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Test des Struktur-Fixers
    import sys
    
    if len(sys.argv) > 1:
        markdown_path = Path(sys.argv[1])
        output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
        
        fixer = StructureFixer()
        result = fixer.improve_structure(markdown_path, output_path)
        
        if result['success']:
            print(f"Struktur erfolgreich verbessert: {result['target']}")
            
            if result['changes']:
                print("\nDurchgeführte Änderungen:")
                for change in result['changes']:
                    print(f" - {change}")
        else:
            print(f"Fehler bei der Strukturverbesserung: {result.get('error', 'Unbekannter Fehler')}")
    else:
        print("Verwendung: python structure_fixer.py <markdown_datei> [output_datei]")