"""
Markdown-Cleaner für die Dokumentenkonvertierungspipeline.
Bereinigt und optimiert konvertierte Markdown-Dateien.
"""

import os
import re
import yaml
from pathlib import Path
import logging
import html
from typing import Dict, Any, List, Tuple, Optional

class MarkdownCleaner:
    """Bereinigt und optimiert konvertierte Markdown-Dateien"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialisiert den Markdown-Cleaner.
        
        Args:
            config: Konfigurationswörterbuch mit Cleaner-Einstellungen
        """
        self.logger = logging.getLogger(__name__)
        self.config = config or {}
        
        # Cleaner-Optionen
        self.fix_headings = self.config.get('fix_headings', True)
        self.fix_links = self.config.get('fix_links', True)
        self.fix_tables = self.config.get('fix_tables', True)
        self.fix_lists = self.config.get('fix_lists', True)
        self.fix_code_blocks = self.config.get('fix_code_blocks', True)
        self.fix_line_breaks = self.config.get('fix_line_breaks', True)
        self.standardize_emphasis = self.config.get('standardize_emphasis', True)
        self.remove_html = self.config.get('remove_html', False)
        self.max_line_length = self.config.get('max_line_length', 0)  # 0 = keine Zeilenbegrenzung
        self.list_marker = self.config.get('list_marker', '*')  # Standard-Aufzählungszeichen
    
    def clean(self, markdown_path: Path, output_path: Optional[Path] = None) -> Dict[str, Any]:
        """
        Bereinigt eine Markdown-Datei.
        
        Args:
            markdown_path: Pfad zur Markdown-Datei
            output_path: Pfad für die bereinigte Datei (falls nicht angegeben, wird die Originaldatei überschrieben)
            
        Returns:
            Dictionary mit Informationen über die Bereinigung
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
            
            # Führe Bereinigungen durch
            cleaned_text, changes = self._clean_markdown(markdown_text)
            
            # Zusammenführen von Frontmatter und bereinigtem Text
            if frontmatter:
                # Konvertiere Frontmatter zu YAML
                frontmatter_yaml = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
                final_content = f"---\n{frontmatter_yaml}---\n\n{cleaned_text}"
            else:
                final_content = cleaned_text
            
            # Speichere das Ergebnis
            if output_path is None:
                output_path = markdown_path
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_content)
            
            self.logger.info(f"Markdown-Datei erfolgreich bereinigt: {output_path}")
            
            return {
                'success': True,
                'source': str(markdown_path),
                'target': str(output_path),
                'changes': changes
            }
            
        except Exception as e:
            self.logger.error(f"Fehler bei der Bereinigung von {markdown_path}: {e}", exc_info=True)
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
    
    def _clean_markdown(self, markdown_text: str) -> Tuple[str, List[str]]:
        """
        Führt alle Bereinigungen am Markdown-Text durch.
        
        Args:
            markdown_text: Markdown-Inhalt ohne Frontmatter
            
        Returns:
            Tuple aus (bereinigter_text, liste_der_änderungen)
        """
        changes = []
        cleaned_text = markdown_text
        
        # 1. Korrigiere Überschriften
        if self.fix_headings:
            new_text, heading_changes = self._fix_headings(cleaned_text)
            if new_text != cleaned_text:
                cleaned_text = new_text
                changes.extend(heading_changes)
        
        # 2. Korrigiere Links und Bilder
        if self.fix_links:
            new_text, link_changes = self._fix_links(cleaned_text)
            if new_text != cleaned_text:
                cleaned_text = new_text
                changes.extend(link_changes)
        
        # 3. Korrigiere Tabellen
        if self.fix_tables:
            new_text, table_changes = self._fix_tables(cleaned_text)
            if new_text != cleaned_text:
                cleaned_text = new_text
                changes.extend(table_changes)
        
        # 4. Korrigiere Listen
        if self.fix_lists:
            new_text, list_changes = self._fix_lists(cleaned_text)
            if new_text != cleaned_text:
                cleaned_text = new_text
                changes.extend(list_changes)
        
        # 5. Korrigiere Code-Blöcke
        if self.fix_code_blocks:
            new_text, code_changes = self._fix_code_blocks(cleaned_text)
            if new_text != cleaned_text:
                cleaned_text = new_text
                changes.extend(code_changes)
        
        # 6. Standardisiere Hervorhebungen
        if self.standardize_emphasis:
            new_text, emphasis_changes = self._standardize_emphasis(cleaned_text)
            if new_text != cleaned_text:
                cleaned_text = new_text
                changes.extend(emphasis_changes)
        
        # 7. Entferne HTML-Tags
        if self.remove_html:
            new_text, html_changes = self._remove_html(cleaned_text)
            if new_text != cleaned_text:
                cleaned_text = new_text
                changes.extend(html_changes)
        
        # 8. Korrigiere Zeilenumbrüche
        if self.fix_line_breaks:
            new_text, linebreak_changes = self._fix_line_breaks(cleaned_text)
            if new_text != cleaned_text:
                cleaned_text = new_text
                changes.extend(linebreak_changes)
        
        # 9. Entferne Sonderzeichen und Steuerzeichen
        new_text, char_changes = self._fix_special_chars(cleaned_text)
        if new_text != cleaned_text:
            cleaned_text = new_text
            changes.extend(char_changes)
        
        # 10. Wende Zeilenlängenbegrenzung an, falls konfiguriert
        if self.max_line_length > 0:
            new_text, wrap_changes = self._wrap_lines(cleaned_text)
            if new_text != cleaned_text:
                cleaned_text = new_text
                changes.extend(wrap_changes)
        
        return cleaned_text, changes
    
    def _fix_headings(self, text: str) -> Tuple[str, List[str]]:
        """
        Korrigiert Überschriften im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        
        # Korrigiere fehlendes Leerzeichen nach #
        pattern = r'^(#+)([^#\s])'
        replacement = r'\1 \2'
        fixed_text, count = re.subn(pattern, replacement, text, flags=re.MULTILINE)
        
        if count > 0:
            changes.append(f"Korrigierte {count} Überschriften (fehlendes Leerzeichen nach #)")
        
        # Entferne überflüssige #-Zeichen am Ende von Überschriften
        pattern = r'^(#+\s+.*?)(\s+#+)$'
        replacement = r'\1'
        fixed_text, count = re.subn(pattern, replacement, fixed_text, flags=re.MULTILINE)
        
        if count > 0:
            changes.append(f"Entfernte {count} überflüssige #-Zeichen am Ende von Überschriften")
        
        # Korrigiere zu lange Setext-Überschriften
        pattern = r'^(.+)\n([=\-]{3,})$'
        replacement = lambda m: f"{'#' if m.group(2)[0] == '=' else '##'} {m.group(1)}"
        fixed_text, count = re.subn(pattern, replacement, fixed_text, flags=re.MULTILINE)
        
        if count > 0:
            changes.append(f"Konvertierte {count} Setext-Überschriften zu ATX-Überschriften")
        
        return fixed_text, changes
    
    def _fix_links(self, text: str) -> Tuple[str, List[str]]:
        """
        Korrigiert Links und Bilder im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        fixed_text = text
        
        # Korrigiere doppelte Klammern in Links
        pattern = r'\[([^\]]*)\]\(+([^)]+)\)+'
        replacement = r'[\1](\2)'
        fixed_text, count = re.subn(pattern, replacement, fixed_text)
        
        if count > 0:
            changes.append(f"Korrigierte {count} Links mit doppelten Klammern")
        
        # Entferne Leerzeichen innerhalb der Link-Klammern
        pattern = r'\[([^\]]*)\]\(\s+([^)]+?)\s+\)'
        replacement = r'[\1](\2)'
        fixed_text, count = re.subn(pattern, replacement, fixed_text)
        
        if count > 0:
            changes.append(f"Entfernte Leerzeichen innerhalb der Link-Klammern bei {count} Links")
        
        # Entferne Escape-Zeichen in URLs
        pattern = r'\[([^\]]*)\]\(\\([^)]+)\)'
        replacement = r'[\1](\2)'
        fixed_text, count = re.subn(pattern, replacement, fixed_text)
        
        if count > 0:
            changes.append(f"Entfernte Escape-Zeichen in {count} Link-URLs")
        
        # Ersetze leere Link-Texte durch die URL
        pattern = r'\[\s*\]\(([^)]+)\)'
        replacement = r'[\1](\1)'
        fixed_text, count = re.subn(pattern, replacement, fixed_text)
        
        if count > 0:
            changes.append(f"Ersetzte {count} leere Link-Texte durch die URL")
        
        # Korrigiere URLs mit HTML-Entities
        def unescape_url(match):
            url = match.group(2)
            try:
                unescaped = html.unescape(url)
                return f"[{match.group(1)}]({unescaped})"
            except:
                return match.group(0)
        
        pattern = r'\[([^\]]*)\]\(([^)]*&[^)]*;[^)]*)\)'
        fixed_text, count = re.subn(pattern, unescape_url, fixed_text)
        
        if count > 0:
            changes.append(f"Korrigierte HTML-Entities in {count} URLs")
        
        return fixed_text, changes
    
    def _fix_tables(self, text: str) -> Tuple[str, List[str]]:
        """
        Korrigiert Tabellen im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        
        # Finde alle Tabellen
        table_pattern = r'(?:^|\n)(\|.+\|)(?:\s*\n\|[-:| ]+\|(?:\s*\n\|.+\|)*)?'
        tables = list(re.finditer(table_pattern, text, re.DOTALL))
        
        if not tables:
            return text, changes
        
        fixed_text = text
        replaced_count = 0
        
        for table_match in reversed(tables):  # Rückwärts, um Indizes zu erhalten
            table = table_match.group(0)
            table_lines = table.strip().split('\n')
            
            # Korrigiere fehlende Trennzeile nach dem Header
            if len(table_lines) >= 1 and not (len(table_lines) >= 2 and re.match(r'^\|[-:| ]+\|$', table_lines[1])):
                # Zähle Spalten in der ersten Zeile
                header_cols = table_lines[0].count('|') - 1
                
                # Erstelle Trennzeile
                delimiter = '|' + '|'.join([' --- '] * header_cols) + '|'
                
                # Füge Trennzeile ein
                table_lines.insert(1, delimiter)
                replaced_count += 1
            
            # Korrigiere inkonsistente Spaltenanzahl
            if len(table_lines) >= 2:
                header_cols = table_lines[0].count('|') - 1
                
                # Prüfe und korrigiere jede Zeile
                fixed_lines = []
                line_fixes = 0
                
                for i, line in enumerate(table_lines):
                    cols = line.count('|') - 1
                    
                    if cols != header_cols:
                        if i == 1 and re.match(r'^\|[-:| ]+\|$', line):  # Trennzeile
                            # Korrigiere Trennzeile
                            delimiter = '|' + '|'.join([' --- '] * header_cols) + '|'
                            fixed_lines.append(delimiter)
                            line_fixes += 1
                        else:
                            # Korrigiere reguläre Zeile
                            cells = line.strip('|').split('|')
                            
                            if cols < header_cols:
                                # Füge fehlende Zellen hinzu
                                cells.extend([''] * (header_cols - cols))
                                line_fixes += 1
                            elif cols > header_cols:
                                # Entferne überschüssige Zellen
                                cells = cells[:header_cols]
                                line_fixes += 1
                            
                            fixed_lines.append('|' + '|'.join(cells) + '|')
                    else:
                        fixed_lines.append(line)
                
                if line_fixes > 0:
                    # Ersetze die Tabelle im Text
                    fixed_table = '\n'.join(fixed_lines)
                    start, end = table_match.span()
                    fixed_text = fixed_text[:start] + fixed_table + fixed_text[end:]
                    replaced_count += 1
        
        if replaced_count > 0:
            changes.append(f"Korrigierte {replaced_count} Tabellen")
        
        return fixed_text, changes
    
    def _fix_lists(self, text: str) -> Tuple[str, List[str]]:
        """
        Korrigiert Listen im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        fixed_text = text
        
        # Standardisiere Aufzählungszeichen, falls konfiguriert
        if self.list_marker in ['*', '-', '+']:
            # Ersetze alle Aufzählungszeichen durch das konfigurierte
            pattern_dash = r'(?:^|\n)([ \t]*)-[ \t]+'
            pattern_asterisk = r'(?:^|\n)([ \t]*)\*[ \t]+'
            pattern_plus = r'(?:^|\n)([ \t]*)\+[ \t]+'
            
            replacement = fr'\1{self.list_marker} '
            
            # Zähle, wie viele Ersetzungen für jedes Zeichen
            if self.list_marker != '-':
                fixed_text, dash_count = re.subn(pattern_dash, replacement, fixed_text)
            else:
                dash_count = 0
                
            if self.list_marker != '*':
                fixed_text, asterisk_count = re.subn(pattern_asterisk, replacement, fixed_text)
            else:
                asterisk_count = 0
                
            if self.list_marker != '+':
                fixed_text, plus_count = re.subn(pattern_plus, replacement, fixed_text)
            else:
                plus_count = 0
            
            total_replacements = dash_count + asterisk_count + plus_count
            if total_replacements > 0:
                changes.append(f"Standardisierte {total_replacements} Aufzählungszeichen zu '{self.list_marker}'")
        
        # Korrigiere fehlendes Leerzeichen nach Aufzählungszeichen
        pattern = fr'(?:^|\n)([ \t]*){re.escape(self.list_marker)}([^ \t])'
        replacement = fr'\1{self.list_marker} \2'
        fixed_text, count = re.subn(pattern, replacement, fixed_text)
        
        if count > 0:
            changes.append(f"Korrigierte {count} Aufzählungszeichen mit fehlendem Leerzeichen")
        
        # Korrigiere nummerierte Listen mit fortlaufender Nummerierung
        pattern = r'(?:^|\n)([ \t]*)(\d+)\.[ \t]+'
        
        # Finde alle nummerierten Listen
        list_starts = []
        current_indent = None
        list_items = []
        
        for match in re.finditer(pattern, fixed_text):
            indent = match.group(1)
            number = int(match.group(2))
            pos = match.start()
            
            # Wenn neue Einrückungsebene oder erster Eintrag
            if current_indent != indent:
                # Speichere die vorherige Liste, falls vorhanden
                if list_items:
                    list_starts.append((current_indent, list_items))
                
                # Starte neue Liste
                current_indent = indent
                list_items = [(pos, number)]
            else:
                # Füge Eintrag zu aktueller Liste hinzu
                list_items.append((pos, number))
        
        # Füge letzte Liste hinzu, falls vorhanden
        if list_items:
            list_starts.append((current_indent, list_items))
        
        # Korrigiere Listen mit falscher Nummerierung
        result_text = fixed_text
        offset = 0
        list_fixes = 0
        
        for indent, items in list_starts:
            # Wenn mehr als ein Eintrag und nicht korrekt nummeriert
            if len(items) > 1:
                should_fix = False
                expected_numbers = list(range(1, len(items) + 1))
                actual_numbers = [num for _, num in items]
                
                # Überprüfe, ob die Nummerierung inkonsistent ist
                if actual_numbers != expected_numbers:
                    should_fix = True
                
                if should_fix:
                    # Korrigiere Nummerierung
                    for i, (pos, num) in enumerate(items):
                        expected = i + 1
                        if num != expected:
                            # Bereite Ersetzung vor
                            adjusted_pos = pos + offset
                            old_str = f"{indent}{num}. "
                            new_str = f"{indent}{expected}. "
                            
                            # Ersetze die Nummer
                            result_text = result_text[:adjusted_pos] + new_str + result_text[adjusted_pos + len(old_str):]
                            
                            # Aktualisiere den Offset
                            offset += len(new_str) - len(old_str)
                            list_fixes += 1
        
        if list_fixes > 0:
            changes.append(f"Korrigierte {list_fixes} falsch nummerierte Listeneinträge")
            fixed_text = result_text
        
        return fixed_text, changes
    
    def _fix_code_blocks(self, text: str) -> Tuple[str, List[str]]:
        """
        Korrigiert Code-Blöcke im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        
        # Finde alle Codeblöcke
        fenced_block_pattern = r'```([^\n`]*)\n([\s\S]*?)```'
        indented_block_pattern = r'(?:(?:^|\n)    [^\n]+)+(?=\n|$)'
        
        # Ersetze Einrückungs-Codeblöcke durch Fenced-Codeblöcke
        indented_blocks = list(re.finditer(indented_block_pattern, text))
        
        fixed_text = text
        offset = 0
        indented_fixes = 0
        
        for match in indented_blocks:
            # Prüfe, ob der Block bereits innerhalb eines Fenced-Blocks ist
            block_start = match.start() + offset
            block_end = match.end() + offset
            block_text = fixed_text[block_start:block_end]
            
            # Überprüfe, ob dieser Block innerhalb eines bestehenden Fenced-Codeblocks liegt
            is_in_fenced_block = False
            for fence_match in re.finditer(fenced_block_pattern, fixed_text):
                fence_start = fence_match.start()
                fence_end = fence_match.end()
                
                if fence_start <= block_start and fence_end >= block_end:
                    is_in_fenced_block = True
                    break
            
            if not is_in_fenced_block:
                # Entferne die Einrückung von 4 Leerzeichen
                unindented_lines = []
                for line in block_text.split('\n'):
                    if line.startswith('    '):
                        unindented_lines.append(line[4:])
                    else:
                        unindented_lines.append(line)
                
                unindented_text = '\n'.join(unindented_lines)
                
                # Ersetze durch Fenced-Codeblock
                replacement = f"```\n{unindented_text}\n```"
                
                fixed_text = fixed_text[:block_start] + replacement + fixed_text[block_end:]
                
                # Aktualisiere Offset
                offset += len(replacement) - len(block_text)
                indented_fixes += 1
        
        if indented_fixes > 0:
            changes.append(f"Konvertierte {indented_fixes} eingerückte Codeblöcke zu Fenced-Codeblöcken")
        
        # Korrigiere fehlende Sprache bei Fenced-Codeblöcken
        def fix_fenced_block(match):
            lang = match.group(1).strip()
            code = match.group(2)
            
            # Wenn keine Sprache angegeben ist, versuche sie zu erraten
            if not lang:
                # Einfache Heuristik für häufige Sprachen
                if re.search(r'function\s+\w+\s*\(.*\)\s*{', code):
                    lang = 'javascript'
                elif re.search(r'def\s+\w+\s*\(.*\):', code):
                    lang = 'python'
                elif re.search(r'public\s+static\s+void\s+main', code):
                    lang = 'java'
                elif re.search(r'<\?php', code):
                    lang = 'php'
                elif re.search(r'#include\s+<', code):
                    lang = 'c'
                elif re.search(r'SELECT\s+.*\s+FROM\s+.*', code, re.IGNORECASE):
                    lang = 'sql'
                
                if lang:
                    return f"```{lang}\n{code}```"
            
            return match.group(0)
        
        fixed_text, count = re.subn(fenced_block_pattern, fix_fenced_block, fixed_text)
        
        if count > 0 and indented_fixes == 0:  # Nur zählen, wenn nicht bereits durch indented_fixes gezählt
            changes.append(f"Verarbeitet {count} Fenced-Codeblöcke")
        
        return fixed_text, changes
    
    def _standardize_emphasis(self, text: str) -> Tuple[str, List[str]]:
        """
        Standardisiert Hervorhebungen im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        fixed_text = text
        
        # Konvertiere Underscore-Hervorhebungen zu Asterisk-Hervorhebungen
        underscore_bold_pattern = r'(?<!\w)__([^_]+)__(?!\w)'
        underscore_italic_pattern = r'(?<!\w)_([^_]+)_(?!\w)'
        
        fixed_text, bold_count = re.subn(underscore_bold_pattern, r'**\1**', fixed_text)
        fixed_text, italic_count = re.subn(underscore_italic_pattern, r'*\1*', fixed_text)
        
        total_emphasis = bold_count + italic_count
        if total_emphasis > 0:
            changes.append(f"Standardisierte {total_emphasis} Underscore-Hervorhebungen zu Asterisk-Hervorhebungen")
        
        # Korrigiere falsche Hervorhebungen (z.B. fehlende Leerzeichen nach Asterisken)
        asterisk_pattern = r'(?<!\*)\*(?!\s)([^\*]+?)(?<!\s)\*(?!\*)'
        fixed_text, count = re.subn(asterisk_pattern, r' *\1* ', fixed_text)
        
        if count > 0:
            changes.append(f"Korrigierte {count} fehlerhafte Hervorhebungen")
        
        # Entferne überflüssige Asterisken (mehr als 3)
        excess_asterisks = r'\*{4,}([^*]+?)\*{4,}'
        fixed_text, count = re.subn(excess_asterisks, r'***\1***', fixed_text)
        
        if count > 0:
            changes.append(f"Korrigierte {count} überflüssige Asterisken")
        
        return fixed_text, changes
    
    def _remove_html(self, text: str) -> Tuple[str, List[str]]:
        """
        Entfernt HTML-Tags im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        
        # Entferne alle HTML-Tags
        html_pattern = r'</?[a-zA-Z0-9]+(\s+[a-zA-Z0-9]+="[^"]*")*\s*/?>'
        fixed_text, count = re.subn(html_pattern, '', text)
        
        if count > 0:
            changes.append(f"Entfernte {count} HTML-Tags")
        
        # Entferne HTML-Kommentare
        comment_pattern = r'<!--[\s\S]*?-->'
        fixed_text, count = re.subn(comment_pattern, '', fixed_text)
        
        if count > 0:
            changes.append(f"Entfernte {count} HTML-Kommentare")
        
        # Konvertiere HTML-Entities
        entity_pattern = r'&[a-zA-Z0-9]+;|&#[0-9]+;|&#x[a-fA-F0-9]+;'
        
        def unescape_entity(match):
            entity = match.group(0)
            try:
                return html.unescape(entity)
            except:
                return entity
        
        fixed_text, count = re.subn(entity_pattern, unescape_entity, fixed_text)
        
        if count > 0:
            changes.append(f"Konvertierte {count} HTML-Entities")
        
        return fixed_text, changes
    
    def _fix_line_breaks(self, text: str) -> Tuple[str, List[str]]:
        """
        Korrigiert Zeilenumbrüche im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        
        # Entferne überflüssige Leerzeilen (mehr als 2 aufeinanderfolgende)
        excessive_newlines = r'\n{3,}'
        fixed_text, count = re.subn(excessive_newlines, '\n\n', text)
        
        if count > 0:
            changes.append(f"Entfernte {count} überflüssige Leerzeilen")
        
        # Stelle sicher, dass Überschriften mit einer Leerzeile davor und danach beginnen
        heading_pattern = r'(?<!\n\n)(^|\n)(#+\s+[^\n]+)(?!\n\n)'
        
        def fix_heading_spacing(match):
            prefix = match.group(1)
            heading = match.group(2)
            
            # Wenn das Prefix ein Zeilenumbruch ist, füge einen weiteren hinzu
            if prefix == '\n':
                prefix = '\n\n'
            # Wenn es der Anfang des Textes ist, kein zusätzlicher Umbruch nötig
            else:
                prefix = ''
            
            return f"{prefix}{heading}\n\n"
        
        fixed_text, count = re.subn(heading_pattern, fix_heading_spacing, fixed_text, flags=re.MULTILINE)
        
        if count > 0:
            changes.append(f"Korrigierte Zeilenumbrüche um {count} Überschriften")
        
        # Entferne Leerzeichen am Zeilenende
        trailing_spaces = r'[ \t]+\n'
        fixed_text, count = re.subn(trailing_spaces, '\n', fixed_text)
        
        if count > 0:
            changes.append(f"Entfernte Leerzeichen am Zeilenende in {count} Zeilen")
        
        return fixed_text, changes
    
    def _fix_special_chars(self, text: str) -> Tuple[str, List[str]]:
        """
        Korrigiert Sonderzeichen und Steuerzeichen im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        changes = []
        
        # Entferne unsichtbare Steuerzeichen
        control_chars = r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]'
        fixed_text, count = re.subn(control_chars, '', text)
        
        if count > 0:
            changes.append(f"Entfernte {count} Steuerzeichen")
        
        # Konvertiere nicht-druckbare Unicode-Zeichen
        def replace_non_printable(match):
            char = match.group(0)
            code = ord(char)
            return f"\\u{code:04x}"
        
        non_printable = r'[\uFFFD\uFFFE\uFFFF]'
        fixed_text, count = re.subn(non_printable, replace_non_printable, fixed_text)
        
        if count > 0:
            changes.append(f"Ersetzte {count} nicht druckbare Unicode-Zeichen")
        
        # Konvertiere Windows-Zeilenumbrüche zu Unix-Zeilenumbrüchen
        cr_lf = r'\r\n'
        fixed_text, count = re.subn(cr_lf, '\n', fixed_text)
        
        if count > 0:
            changes.append(f"Konvertierte {count} Windows-Zeilenumbrüche zu Unix-Zeilenumbrüchen")
        
        return fixed_text, changes
    
    def _wrap_lines(self, text: str) -> Tuple[str, List[str]]:
        """
        Begrenzt die Zeilenlänge im Markdown.
        
        Args:
            text: Markdown-Text
            
        Returns:
            Tuple aus (korrigierter_text, änderungen)
        """
        if self.max_line_length <= 0:
            return text, []
        
        changes = []
        result_lines = []
        wrap_count = 0
        
        # Splitten des Textes in Zeilen
        lines = text.split('\n')
        
        # Spezielle Zeilen, die nicht umgebrochen werden sollten
        no_wrap_patterns = [
            r'^\s*#+\s+', # Überschriften
            r'^\s*```', # Codeblock-Markierungen
            r'^\s*\|', # Tabellen
            r'^\s*!\[', # Bilder
            r'^\s*[*+-]\s+', # Listen
            r'^\s*\d+\.\s+' # Nummerierte Listen
        ]
        
        for line in lines:
            # Prüfen, ob die Zeile nicht umgebrochen werden sollte
            should_wrap = True
            for pattern in no_wrap_patterns:
                if re.match(pattern, line):
                    should_wrap = False
                    break
            
            # Wenn die Zeile umgebrochen werden soll und länger als max_line_length ist
            if should_wrap and len(line) > self.max_line_length:
                wrapped_lines = self._wrap_line(line, self.max_line_length)
                result_lines.extend(wrapped_lines)
                wrap_count += 1
            else:
                result_lines.append(line)
        
        if wrap_count > 0:
            changes.append(f"Umbruch von {wrap_count} langen Zeilen")
        
        return '\n'.join(result_lines), changes
    
    def _wrap_line(self, line: str, max_length: int) -> List[str]:
        """
        Bricht eine lange Zeile in mehrere Zeilen um.
        
        Args:
            line: Die zu brechende Zeile
            max_length: Maximale Zeilenlänge
            
        Returns:
            Liste der umgebrochenen Zeilen
        """
        if len(line) <= max_length:
            return [line]
        
        wrapped_lines = []
        current_line = ""
        words = line.split(' ')
        
        for word in words:
            if len(current_line) + len(word) + 1 <= max_length:
                if current_line:
                    current_line += ' ' + word
                else:
                    current_line = word
            else:
                wrapped_lines.append(current_line)
                current_line = word
        
        if current_line:
            wrapped_lines.append(current_line)
        
        return wrapped_lines


if __name__ == "__main__":
    # Setup Logging
    logging.basicConfig(level=logging.INFO, 
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Test des Markdown-Cleaners
    import sys
    
    if len(sys.argv) > 1:
        markdown_path = Path(sys.argv[1])
        output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
        
        cleaner = MarkdownCleaner({
            'fix_headings': True,
            'fix_links': True,
            'fix_tables': True,
            'fix_lists': True,
            'fix_code_blocks': True,
            'fix_line_breaks': True,
            'standardize_emphasis': True,
            'remove_html': False,
            'max_line_length': 80,  # Für den Test
            'list_marker': '*'
        })
        
        result = cleaner.clean(markdown_path, output_path)
        
        if result['success']:
            print(f"Bereinigung erfolgreich: {result['target']}")
            
            if result['changes']:
                print("\nDurchgeführte Änderungen:")
                for change in result['changes']:
                    print(f" - {change}")
        else:
            print(f"Fehler bei der Bereinigung: {result.get('error', 'Unbekannter Fehler')}")
    else:
        print("Verwendung: python cleaner.py <markdown_datei> [output_datei]")