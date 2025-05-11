"""
Tabellen-Formatierer für die Dokumentenkonvertierungspipeline.
Verbessert die Formatierung von Markdown-Tabellen.
"""

import os
import re
from pathlib import Path
import logging
from typing import Dict, Any, List, Tuple, Optional, Set
import numpy as np

class TableFormatter:
    """Verbessert die Formatierung von Markdown-Tabellen"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialisiert den Tabellen-Formatierer.
        
        Args:
            config: Konfigurationswörterbuch mit Formatierer-Einstellungen
        """
        self.logger = logging.getLogger(__name__)
        self.config = config or {}
        
        # Formatierungs-Optionen
        self.align_columns = self.config.get('align_columns', True)
        self.auto_align_numbers = self.config.get('auto_align_numbers', True)
        self.fix_column_widths = self.config.get('fix_column_widths', True)
        self.max_column_width = self.config.get('max_column_width', 30)
        self.min_column_width = self.config.get('min_column_width', 3)
        self.pretty_format = self.config.get('pretty_format', True)
    
    def format_tables(self, markdown_path: Path, output_path: Optional[Path] = None) -> Dict[str, Any]:
        """
        Formatiert Tabellen in einer Markdown-Datei.
        
        Args:
            markdown_path: Pfad zur Markdown-Datei
            output_path: Pfad für die formatierte Datei (falls nicht angegeben, wird die Originaldatei überschrieben)
            
        Returns:
            Dictionary mit Informationen über die Formatierung
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
            
            # Formatiere Tabellen
            formatted_content, changes = self._format_tables(content)
            
            # Speichere das Ergebnis
            if output_path is None:
                output_path = markdown_path
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(formatted_content)
            
            self.logger.info(f"Tabellen erfolgreich formatiert: {output_path}")
            
            return {
                'success': True,
                'source': str(markdown_path),
                'target': str(output_path),
                'changes': changes
            }
            
        except Exception as e:
            self.logger.error(f"Fehler bei der Tabellenformatierung von {markdown_path}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'changes': []
            }
    
    def _format_tables(self, content: str) -> Tuple[str, List[str]]:
        """
        Formatiert alle Tabellen im Markdown-Text.
        
        Args:
            content: Markdown-Inhalt
            
        Returns:
            Tuple aus (formatierter_text, liste_der_änderungen)
        """
        changes = []
        
        # Regex-Muster, um Tabellen in Markdown zu finden
        # Muster: Eine Zeile mit |, gefolgt von einer Trennerzeile mit | und -, dann optional weitere Zeilen mit |
        table_pattern = r'(\|.+\|)\n(\|[\s:-]+\|)(?:\n\|.+\|)*'
        
        # Finde alle Tabellen im Text
        tables = list(re.finditer(table_pattern, content, re.MULTILINE))
        
        if not tables:
            return content, []  # Keine Tabellen gefunden
        
        # Verarbeite jede Tabelle
        result_content = content
        offset = 0  # Offset durch Änderungen der Textlänge
        
        for i, table_match in enumerate(tables):
            # Extrahiere die Tabelle
            table_start = table_match.start() + offset
            table_end = table_match.end() + offset
            original_table = result_content[table_start:table_end]
            
            # Formatiere die Tabelle
            formatted_table, table_changes = self._format_table(original_table, i+1)
            
            # Ersetze die Tabelle im Text, falls Änderungen vorgenommen wurden
            if formatted_table != original_table:
                result_content = result_content[:table_start] + formatted_table + result_content[table_end:]
                
                # Aktualisiere den Offset
                offset += len(formatted_table) - len(original_table)
                
                # Sammle die Änderungen
                changes.extend(table_changes)
        
        return result_content, changes
    
    def _format_table(self, table_text: str, table_number: int) -> Tuple[str, List[str]]:
        """
        Formatiert eine einzelne Markdown-Tabelle.
        
        Args:
            table_text: Text der Tabelle
            table_number: Nummer der Tabelle (für Änderungsnachrichten)
            
        Returns:
            Tuple aus (formatierte_tabelle, liste_der_änderungen)
        """
        changes = []
        
        # Teile die Tabelle in Zeilen auf
        table_lines = table_text.strip().split('\n')
        
        if len(table_lines) < 2:
            # Ungültige Tabelle (mindestens Header und Trennzeile erforderlich)
            return table_text, []
        
        # Extrahiere Zellen aus jeder Zeile
        rows = []
        for line in table_lines:
            # Entferne führende und abschließende | und teile dann an |
            line = line.strip()
            if line.startswith('|'):
                line = line[1:]
            if line.endswith('|'):
                line = line[:-1]
            
            cells = [cell.strip() for cell in line.split('|')]
            rows.append(cells)
        
        # Ermittle die Ausrichtung aus der Trennzeile
        alignments = self._extract_alignments(rows[1])
        
        # Wenn Auto-Ausrichtung für Zahlen aktiviert ist, bestimme die Spaltentypen
        if self.auto_align_numbers:
            column_types = self._detect_column_types(rows)
            
            # Aktualisiere die Ausrichtung basierend auf den Spaltentypen
            for i, col_type in enumerate(column_types):
                if i < len(alignments):
                    if col_type == 'numeric' and alignments[i] == 'left':
                        alignments[i] = 'right'
                        changes.append(f"Tabelle {table_number}: Spalte {i+1} auf rechts ausgerichtet (numerisch)")
        
        # Bestimme optimale Spaltenbreiten
        if self.fix_column_widths:
            col_widths = self._calculate_column_widths(rows)
        else:
            # Verwende vorhandene Zellenbreiten
            col_widths = [len(cell) for cell in rows[0]]
        
        # Erstelle die formatierte Tabelle
        formatted_lines = []
        
        # Formatiere die Header-Zeile
        header_cells = []
        for i, cell in enumerate(rows[0]):
            if i < len(col_widths):
                # Begrenzt auf die berechnete Spaltenbreite
                width = col_widths[i]
                padded_cell = self._pad_cell(cell, width, 'center')
                header_cells.append(padded_cell)
            else:
                header_cells.append(cell)
        
        formatted_lines.append('| ' + ' | '.join(header_cells) + ' |')
        
        # Formatiere die Trennzeile basierend auf Ausrichtung
        delimiter_cells = []
        for i, align in enumerate(alignments):
            if i < len(col_widths):
                width = col_widths[i]
                
                if align == 'left':
                    delim = ':' + '-' * (width - 1)
                elif align == 'right':
                    delim = '-' * (width - 1) + ':'
                elif align == 'center':
                    delim = ':' + '-' * (width - 2) + ':'
                else:
                    delim = '-' * width
                
                delimiter_cells.append(delim)
            else:
                delimiter_cells.append('---')
        
        formatted_lines.append('| ' + ' | '.join(delimiter_cells) + ' |')
        
        # Formatiere die Datenzeilen
        for row_idx, row in enumerate(rows[2:], start=2):
            row_cells = []
            
            for i, cell in enumerate(row):
                if i < len(col_widths) and i < len(alignments):
                    width = col_widths[i]
                    align = alignments[i]
                    padded_cell = self._pad_cell(cell, width, align)
                    row_cells.append(padded_cell)
                else:
                    row_cells.append(cell)
            
            formatted_lines.append('| ' + ' | '.join(row_cells) + ' |')
        
        # Füge Pretty-Formatting hinzu, falls aktiviert
        if self.pretty_format:
            # Füge eine Leerzeile vor und nach der Tabelle hinzu
            pretty_lines = [''] + formatted_lines + ['']
            formatted_table = '\n'.join(pretty_lines)
            changes.append(f"Tabelle {table_number}: Pretty-Formatting angewendet")
        else:
            formatted_table = '\n'.join(formatted_lines)
        
        # Wenn Änderungen vorgenommen wurden
        if formatted_table != table_text:
            if not changes:
                changes.append(f"Tabelle {table_number}: Formatierung verbessert")
        
        return formatted_table, changes
    
    def _extract_alignments(self, delimiter_row: List[str]) -> List[str]:
        """
        Extrahiert die Spaltenausrichtung aus der Trennzeile.
        
        Args:
            delimiter_row: Liste der Zellen aus der Trennzeile
            
        Returns:
            Liste mit Ausrichtungstypen ('left', 'right', 'center', 'default')
        """
        alignments = []
        
        for cell in delimiter_row:
            cell = cell.strip()
            
            # Prüfe auf verschiedene Ausrichtungstypen
            if cell.startswith(':') and cell.endswith(':'):
                alignments.append('center')
            elif cell.startswith(':'):
                alignments.append('left')
            elif cell.endswith(':'):
                alignments.append('right')
            else:
                # Standardausrichtung (links)
                alignments.append('default')
        
        return alignments
    
    def _detect_column_types(self, rows: List[List[str]]) -> List[str]:
        """
        Erkennt die Typen der Spalten (numerisch oder Text).
        
        Args:
            rows: Liste von Zeilen mit Zellen
            
        Returns:
            Liste mit Spaltentypen ('numeric', 'text')
        """
        if len(rows) <= 2:  # Nur Header und Trennzeile vorhanden
            return ['text'] * len(rows[0])
        
        # Anzahl der Spalten
        num_columns = max(len(row) for row in rows)
        column_types = ['text'] * num_columns
        
        # Überprüfe jede Spalte
        for col_idx in range(num_columns):
            # Überspringe Header und Trennzeile
            numerical_values = 0
            total_values = 0
            
            for row_idx, row in enumerate(rows):
                if row_idx <= 1:  # Header oder Trennzeile
                    continue
                
                if col_idx < len(row):
                    cell = row[col_idx].strip()
                    
                    if cell:  # Nicht leere Zelle
                        total_values += 1
                        
                        # Prüfe, ob die Zelle numerisch ist
                        if self._is_numeric(cell):
                            numerical_values += 1
            
            # Wenn mindestens 70% der Werte numerisch sind, klassifiziere die Spalte als numerisch
            if total_values > 0 and numerical_values / total_values >= 0.7:
                column_types[col_idx] = 'numeric'
        
        return column_types
    
    def _is_numeric(self, text: str) -> bool:
        """
        Prüft, ob ein Text numerisch ist.
        
        Args:
            text: Zu prüfender Text
            
        Returns:
            True, wenn der Text numerisch ist, sonst False
        """
        # Entferne Tausender-Trennzeichen und ersetze Komma durch Punkt
        cleaned_text = text.replace('.', '').replace(',', '.')
        
        # Erlaubte Formate: Ganzzahlen, Dezimalzahlen, Prozentwerte, etc.
        patterns = [
            r'^-?\d+$',                      # Ganzzahlen
            r'^-?\d+\.\d+$',                 # Dezimalzahlen
            r'^-?\d+,\d+$',                  # Dezimalzahlen mit Komma
            r'^-?\d+[,\.]\d+\s*%$',          # Prozentwerte
            r'^-?\d+[,\.]\d+\s*€$',          # Euro-Beträge
            r'^-?\d+[,\.]\d+\s*\$',          # Dollar-Beträge
            r'^€\s*-?\d+[,\.]\d+$',          # Euro-Beträge (Symbol vorne)
            r'^\$\s*-?\d+[,\.]\d+$'          # Dollar-Beträge (Symbol vorne)
        ]
        
        return any(re.match(pattern, cleaned_text) for pattern in patterns)
    
    def _calculate_column_widths(self, rows: List[List[str]]) -> List[int]:
        """
        Berechnet optimale Spaltenbreiten basierend auf dem Inhalt.
        
        Args:
            rows: Liste von Zeilen mit Zellen
            
        Returns:
            Liste mit Spaltenbreiten
        """
        # Anzahl der Spalten
        num_columns = max(len(row) for row in rows)
        
        # Initialisiere Breitenarray
        col_widths = [self.min_column_width] * num_columns
        
        # Berechne maximale Inhaltsbreite für jede Spalte
        for row in rows:
            for i, cell in enumerate(row):
                if i < num_columns:
                    cell_content = cell.strip()
                    col_widths[i] = max(col_widths[i], min(len(cell_content), self.max_column_width))
        
        return col_widths
    
    def _pad_cell(self, cell: str, width: int, align: str) -> str:
        """
        Polstert eine Zelle auf die angegebene Breite und Ausrichtung.
        
        Args:
            cell: Zellinhalt
            width: Zielbreite
            align: Ausrichtung ('left', 'right', 'center', 'default')
            
        Returns:
            Gepolsterte Zelle
        """
        cell_content = cell.strip()
        
        # Begrenze die Zellenbreite auf die maximale Breite
        if len(cell_content) > width:
            cell_content = cell_content[:width-1] + '…'
        
        # Polstere basierend auf der Ausrichtung
        if align == 'right':
            return ' ' * (width - len(cell_content)) + cell_content
        elif align == 'center':
            left_pad = (width - len(cell_content)) // 2
            right_pad = width - len(cell_content) - left_pad
            return ' ' * left_pad + cell_content + ' ' * right_pad
        else:  # 'left' oder 'default'
            return cell_content + ' ' * (width - len(cell_content))


if __name__ == "__main__":
    # Setup Logging
    logging.basicConfig(level=logging.INFO, 
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Test des Tabellen-Formatierers
    import sys
    
    if len(sys.argv) > 1:
        markdown_path = Path(sys.argv[1])
        output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
        
        formatter = TableFormatter()
        result = formatter.format_tables(markdown_path, output_path)
        
        if result['success']:
            print(f"Tabellen erfolgreich formatiert: {result['target']}")
            
            if result['changes']:
                print("\nDurchgeführte Änderungen:")
                for change in result['changes']:
                    print(f" - {change}")
        else:
            print(f"Fehler bei der Tabellenformatierung: {result.get('error', 'Unbekannter Fehler')}")
    else:
        print("Verwendung: python table_formatter.py <markdown_datei> [output_datei]")