"""
PDF-Konverter für die Dokumentenkonvertierungspipeline.
Konvertiert PDF-Dokumente in strukturierte Markdown-Dateien.
"""

import os
import re
import fitz  # PyMuPDF
from pathlib import Path
import logging
from typing import Dict, Any, List, Tuple, Optional, Set
import numpy as np
from PIL import Image
import io
import camelot
import tabula

from .base_converter import BaseConverter

class PDFConverter(BaseConverter):
    """Konvertiert PDF-Dokumente in strukturierte Markdown-Dateien"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialisiert den PDF-Konverter.
        
        Args:
            config: Konfigurationswörterbuch mit Konvertereinstellungen
        """
        super().__init__(config)
        
        # PDF-spezifische Konfiguration
        self.extract_images = self.config.get('extract_images', True)
        self.max_image_size = self.config.get('max_image_size', 1024)  # Max. Bildbreite oder -höhe in Pixeln
        self.detect_tables = self.config.get('detect_tables', True)
        self.table_detection_method = self.config.get('table_detection_method', 'hybrid')  # 'camelot', 'tabula', 'hybrid'
        self.min_table_rows = self.config.get('min_table_rows', 3)
        self.min_table_columns = self.config.get('min_table_columns', 2)
        self.ocr_enabled = self.config.get('ocr_enabled', False)  # OCR-Unterstützung (erfordert Tesseract)
        self.table_confidence_threshold = self.config.get('table_confidence_threshold', 0.6)
    
    def _convert_to_markdown(self, source_path: Path) -> Tuple[str, Dict[str, Any]]:
        """
        Konvertiert eine PDF-Datei in Markdown.
        
        Args:
            source_path: Pfad zur PDF-Datei
            
        Returns:
            Tuple aus (markdown_content, metadata)
        """
        self.logger.info(f"Starte Konvertierung von PDF: {source_path}")
        
        # Öffne das PDF-Dokument
        with fitz.open(str(source_path)) as pdf_doc:
            # Metadaten extrahieren
            metadata = self._extract_metadata(pdf_doc)
            
            # Struktur des Dokuments analysieren
            doc_structure = self._analyze_document_structure(pdf_doc)
            
            # Inhaltsverzeichnis extrahieren (falls vorhanden)
            toc = pdf_doc.get_toc()
            
            # Assets-Verzeichnis für Bilder
            assets_dir = source_path.parent / 'assets'
            os.makedirs(assets_dir, exist_ok=True)
            
            # Extrahiere und konvertiere Seiten
            markdown_content = self._process_pages(pdf_doc, doc_structure, assets_dir)
            
            # Füge Inhaltsverzeichnis hinzu, wenn vorhanden
            if toc and len(toc) > 0:
                toc_markdown = self._format_toc(toc)
                markdown_content = toc_markdown + "\n\n" + markdown_content
            
            self.logger.info(f"PDF-Konvertierung abgeschlossen: {len(markdown_content)} Zeichen")
            
            return markdown_content, metadata
    
    def _extract_metadata(self, pdf_doc: fitz.Document) -> Dict[str, Any]:
        """
        Extrahiert Metadaten aus dem PDF-Dokument.
        
        Args:
            pdf_doc: PyMuPDF-Dokument
            
        Returns:
            Dictionary mit Metadaten
        """
        raw_metadata = pdf_doc.metadata
        
        # Standardisierte Metadaten
        metadata = {
            'title': raw_metadata.get('title', '') or Path(pdf_doc.name).stem,
            'author': raw_metadata.get('author', ''),
            'creation_date': raw_metadata.get('creationDate', ''),
            'modification_date': raw_metadata.get('modDate', ''),
            'subject': raw_metadata.get('subject', ''),
            'keywords': raw_metadata.get('keywords', ''),
            'pages': len(pdf_doc),
            'original_format': 'PDF',
            'has_images': any(img for page in pdf_doc for img in page.get_images()),
            'has_tables': False,  # Wird später aktualisiert, wenn Tabellen erkannt werden
            'has_toc': len(pdf_doc.get_toc()) > 0
        }
        
        return metadata
    
    def _analyze_document_structure(self, pdf_doc: fitz.Document) -> Dict[str, Any]:
        """
        Analysiert die Struktur des PDF-Dokuments für eine bessere Konvertierung.
        
        Args:
            pdf_doc: PyMuPDF-Dokument
            
        Returns:
            Dictionary mit Strukturinformationen
        """
        structure = {
            'font_stats': {},
            'heading_candidates': [],
            'layout_type': 'unknown',
            'page_margins': [],
            'column_layout': []
        }
        
        # Analysiere die ersten 10 Seiten (oder alle, wenn weniger)
        sample_pages = min(10, len(pdf_doc))
        
        # Sammle Fontstatistiken
        all_fonts = {}
        for page_num in range(sample_pages):
            page = pdf_doc[page_num]
            page_dict = page.get_text("dict")
            
            # Seitenränder erkennen
            if 'width' in page_dict and 'height' in page_dict:
                page_width = page_dict['width']
                page_height = page_dict['height']
                
                # Analysiere Textblöcke, um Ränder zu schätzen
                if 'blocks' in page_dict:
                    left_positions = []
                    right_positions = []
                    top_positions = []
                    bottom_positions = []
                    
                    for block in page_dict['blocks']:
                        if 'lines' in block:
                            for line in block['lines']:
                                if 'bbox' in line:
                                    bbox = line['bbox']
                                    left_positions.append(bbox[0])
                                    right_positions.append(bbox[2])
                                    top_positions.append(bbox[1])
                                    bottom_positions.append(bbox[3])
                    
                    # Berechne Seitenränder
                    if left_positions and right_positions and top_positions and bottom_positions:
                        left_margin = min(left_positions)
                        right_margin = page_width - max(right_positions)
                        top_margin = min(top_positions)
                        bottom_margin = page_height - max(bottom_positions)
                        
                        structure['page_margins'].append({
                            'page': page_num,
                            'left': left_margin,
                            'right': right_margin,
                            'top': top_margin,
                            'bottom': bottom_margin
                        })
            
            # Prüfe auf Mehrspaltenlayout
            columns_detected = self._detect_columns(page_dict)
            structure['column_layout'].append({
                'page': page_num,
                'columns': columns_detected
            })
            
            # Sammle Font-Informationen
            if 'blocks' in page_dict:
                for block in page_dict['blocks']:
                    if 'lines' in block:
                        for line in block['lines']:
                            if 'spans' in line:
                                for span in line['spans']:
                                    if 'font' in span and 'size' in span:
                                        font_key = f"{span['font']}_{span['size']}"
                                        if font_key not in all_fonts:
                                            all_fonts[font_key] = {
                                                'font': span['font'],
                                                'size': span['size'],
                                                'count': 1,
                                                'is_bold': 'bold' in span['font'].lower() or 'heavy' in span['font'].lower(),
                                                'is_italic': 'italic' in span['font'].lower() or 'oblique' in span['font'].lower()
                                            }
                                        else:
                                            all_fonts[font_key]['count'] += 1
        
        # Sortiere Fonts nach Häufigkeit
        sorted_fonts = sorted(all_fonts.values(), key=lambda x: x['count'], reverse=True)
        structure['font_stats'] = sorted_fonts
        
        # Identifiziere mögliche Überschriften basierend auf Fontgröße und Formatierung
        if sorted_fonts:
            # Bestimme den häufigsten Font als Standardtext
            body_font = sorted_fonts[0]
            body_font_size = body_font['size']
            
            # Finde Fonts, die größer als der Standardtext sind (mögliche Überschriften)
            for font in sorted_fonts:
                # Wenn der Font größer ist oder fett und gleich groß
                if font['size'] > body_font_size * 1.2 or (font['is_bold'] and font['size'] >= body_font_size):
                    heading_level = 0
                    
                    # Je größer der Font, desto kleiner die Überschriftenebene
                    if font['size'] >= body_font_size * 1.8:
                        heading_level = 1  # h1
                    elif font['size'] >= body_font_size * 1.5:
                        heading_level = 2  # h2
                    elif font['size'] >= body_font_size * 1.2:
                        heading_level = 3  # h3
                    elif font['is_bold'] and font['size'] >= body_font_size:
                        heading_level = 4  # h4
                    
                    if heading_level > 0:
                        structure['heading_candidates'].append({
                            'font': font['font'],
                            'size': font['size'],
                            'is_bold': font['is_bold'],
                            'is_italic': font['is_italic'],
                            'heading_level': heading_level
                        })
        
        # Bestimme den Layout-Typ basierend auf der Spaltenanalyse
        column_counts = [layout['columns'] for layout in structure['column_layout']]
        if column_counts:
            most_common_columns = max(set(column_counts), key=column_counts.count)
            if most_common_columns == 1:
                structure['layout_type'] = 'single_column'
            elif most_common_columns == 2:
                structure['layout_type'] = 'double_column'
            else:
                structure['layout_type'] = 'multi_column'
        
        return structure
    
    def _detect_columns(self, page_dict: Dict[str, Any]) -> int:
        """
        Erkennt die Anzahl der Spalten auf einer Seite.
        
        Args:
            page_dict: PyMuPDF-Seitenwörterbuch
            
        Returns:
            Anzahl der erkannten Spalten
        """
        if 'blocks' not in page_dict or not page_dict['blocks']:
            return 1
        
        # Sammle x-Positionen aller Textblöcke
        x_positions = []
        
        for block in page_dict['blocks']:
            if 'lines' in block:
                for line in block['lines']:
                    if 'bbox' in line:
                        bbox = line['bbox']
                        x_mid = (bbox[0] + bbox[2]) / 2  # Mittelpunkt des Textblocks
                        x_positions.append(x_mid)
        
        if not x_positions:
            return 1
        
        # Analysiere x-Positionen, um Spalten zu erkennen
        x_positions.sort()
        page_width = page_dict.get('width', 0)
        
        if page_width == 0:
            return 1
        
        # Bin the x-positions to detect columns
        bins = np.linspace(0, page_width, 20)  # Teile Seite in 20 Bereiche
        hist, _ = np.histogram(x_positions, bins=bins)
        
        # Finde Lücken in der Verteilung
        gaps = []
        for i in range(1, len(hist)):
            if hist[i-1] > 0 and hist[i] == 0:
                gap_start = bins[i]
                
                # Finde das Ende der Lücke
                gap_end = bins[i]
                for j in range(i+1, len(hist)):
                    if hist[j] == 0:
                        gap_end = bins[j+1]
                    else:
                        break
                
                gap_width = gap_end - gap_start
                
                # Nur signifikante Lücken zählen
                if gap_width > page_width * 0.1:
                    gaps.append(gap_width)
        
        # Anzahl der Spalten basierend auf Lücken
        if not gaps:
            return 1
        elif len(gaps) == 1:
            return 2
        else:
            return len(gaps) + 1
    
    def _process_pages(self, pdf_doc: fitz.Document, doc_structure: Dict[str, Any], assets_dir: Path) -> str:
        """
        Verarbeitet alle Seiten des PDF-Dokuments und konvertiert sie in Markdown.
        
        Args:
            pdf_doc: PyMuPDF-Dokument
            doc_structure: Dokumentstruktur
            assets_dir: Verzeichnis für extrahierte Assets
            
        Returns:
            Markdown-Inhalt
        """
        markdown_parts = []
        processed_tables = set()  # Um doppelte Tabellen zu vermeiden
        image_count = 0
        
        for page_num in range(len(pdf_doc)):
            self.logger.info(f"Verarbeite Seite {page_num+1}/{len(pdf_doc)}")
            page = pdf_doc[page_num]
            
            # Text extrahieren
            page_text = page.get_text("dict")
            
            # Bestimme Layout-Typ für diese Seite
            layout_type = 'single_column'
            if page_num < len(doc_structure['column_layout']):
                columns = doc_structure['column_layout'][page_num]['columns']
                if columns == 2:
                    layout_type = 'double_column'
                elif columns > 2:
                    layout_type = 'multi_column'
            
            # Tabellen erkennen und extrahieren (falls aktiviert)
            tables = []
            if self.detect_tables:
                tables = self._extract_tables(page, page_num, pdf_doc.name, processed_tables)
            
            # Bilder extrahieren (falls aktiviert)
            images = []
            if self.extract_images:
                images = self._extract_images(page, page_num, assets_dir, image_count)
                image_count += len(images)
            
            # Verarbeite Text basierend auf Layout
            if layout_type == 'single_column':
                markdown_text = self._process_single_column(page_text, doc_structure, tables, images)
            else:
                markdown_text = self._process_multi_column(page_text, doc_structure, tables, images, columns)
            
            markdown_parts.append(markdown_text)
        
        # Kombiniere alle Seitenteile
        return "\n\n".join(markdown_parts)
    
    def _process_single_column(self, page_text: Dict[str, Any], doc_structure: Dict[str, Any], 
                              tables: List[Dict[str, Any]], images: List[Dict[str, Any]]) -> str:
        """
        Verarbeitet eine einspaltige Seite.
        
        Args:
            page_text: PyMuPDF-Seitenwörterbuch
            doc_structure: Dokumentstruktur
            tables: Liste der erkannten Tabellen
            images: Liste der extrahierten Bilder
            
        Returns:
            Markdown-Text für die Seite
        """
        markdown_parts = []
        heading_candidates = doc_structure.get('heading_candidates', [])
        
        # Organisiere Blöcke nach y-Position
        blocks = []
        if 'blocks' in page_text:
            for block in page_text['blocks']:
                if 'lines' in block and block['lines']:
                    y_pos = block['lines'][0]['bbox'][1]  # Obere y-Position des ersten Blocks
                    blocks.append((y_pos, block))
        
        # Sortiere Blöcke nach y-Position
        blocks.sort(key=lambda x: x[0])
        
        # Verarbeite Blöcke
        for _, block in blocks:
            block_text = ""
            block_is_heading = False
            heading_level = 0
            
            # Sammel Text aus allen Spans und prüfe, ob es eine Überschrift ist
            spans_in_block = []
            for line in block['lines']:
                for span in line['spans']:
                    font_info = {
                        'font': span['font'],
                        'size': span['size'],
                        'is_bold': 'bold' in span['font'].lower() or 'heavy' in span['font'].lower(),
                        'text': span['text']
                    }
                    spans_in_block.append(font_info)
                    block_text += span['text']
                
                # Füge Zeilenumbruch hinzu, außer bei der letzten Zeile
                if line != block['lines'][-1]:
                    block_text += " "
            
            # Prüfe, ob der Block eine Überschrift ist
            for span in spans_in_block:
                for heading_candidate in heading_candidates:
                    if (span['font'] == heading_candidate['font'] and 
                        abs(span['size'] - heading_candidate['size']) < 0.1):
                        block_is_heading = True
                        heading_level = heading_candidate['heading_level']
                        break
            
            # Formatiere Block als Markdown
            if block_is_heading and block_text.strip():
                heading_prefix = '#' * heading_level
                markdown_parts.append(f"{heading_prefix} {block_text.strip()}")
            else:
                # Normaler Textblock
                if block_text.strip():
                    # Prüfe auf Listen
                    if block_text.strip().startswith('•') or block_text.strip().startswith('-'):
                        # Listenelement
                        markdown_parts.append(f"* {block_text.strip()[1:].strip()}")
                    elif re.match(r'^\d+\.', block_text.strip()):
                        # Nummerierte Liste
                        pattern = r'^\d+\.'
                        markdown_parts.append(f"1. {re.sub(pattern, '', block_text.strip()).strip()}")
                    else:
                        # Normaler Absatz
                        markdown_parts.append(block_text.strip())
        
        # Füge Tabellen an den richtigen Stellen ein
        if tables:
            for table in tables:
                y_pos = table['bbox'][1]
                
                # Finde die richtige Position im Markdown basierend auf y-Position
                insert_pos = 0
                for i, block in enumerate(blocks):
                    if block[0] > y_pos:
                        insert_pos = i
                        break
                
                if insert_pos >= len(markdown_parts):
                    # Tabelle am Ende einfügen
                    markdown_parts.append("\n" + table['markdown'] + "\n")
                else:
                    # Tabelle an der richtigen Position einfügen
                    markdown_parts.insert(insert_pos, "\n" + table['markdown'] + "\n")
        
        # Füge Bilder an den richtigen Stellen ein
        if images:
            for image in images:
                y_pos = image['bbox'][1]
                
                # Finde die richtige Position im Markdown basierend auf y-Position
                insert_pos = 0
                for i, block in enumerate(blocks):
                    if block[0] > y_pos:
                        insert_pos = i
                        break
                
                if insert_pos >= len(markdown_parts):
                    # Bild am Ende einfügen
                    markdown_parts.append(f"\n![{image['alt']}]({image['path']})\n")
                else:
                    # Bild an der richtigen Position einfügen
                    markdown_parts.insert(insert_pos, f"\n![{image['alt']}]({image['path']})\n")
        
        return "\n\n".join(markdown_parts)
    
    def _process_multi_column(self, page_text: Dict[str, Any], doc_structure: Dict[str, Any], 
                             tables: List[Dict[str, Any]], images: List[Dict[str, Any]], 
                             num_columns: int) -> str:
        """
        Verarbeitet eine mehrspaltige Seite.
        
        Args:
            page_text: PyMuPDF-Seitenwörterbuch
            doc_structure: Dokumentstruktur
            tables: Liste der erkannten Tabellen
            images: Liste der extrahierten Bilder
            num_columns: Anzahl der Spalten
            
        Returns:
            Markdown-Text für die Seite
        """
        if 'width' not in page_text:
            return self._process_single_column(page_text, doc_structure, tables, images)
        
        page_width = page_text['width']
        column_width = page_width / num_columns
        
        # Teile die Seite in Spalten auf
        columns = [[] for _ in range(num_columns)]
        
        # Weise Blöcke den Spalten zu
        if 'blocks' in page_text:
            for block in page_text['blocks']:
                if 'lines' in block and block['lines']:
                    # Bestimme die Spalte anhand der x-Position
                    x_mid = (block['bbox'][0] + block['bbox'][2]) / 2
                    column_idx = int(x_mid / column_width)
                    
                    # Begrenze auf die Anzahl der Spalten
                    column_idx = min(column_idx, num_columns - 1)
                    
                    # Füge Block der Spalte hinzu mit y-Position für die Sortierung
                    y_pos = block['lines'][0]['bbox'][1]
                    columns[column_idx].append((y_pos, block))
        
        # Sortiere Blöcke in jeder Spalte nach y-Position
        for i in range(num_columns):
            columns[i].sort(key=lambda x: x[0])
        
        # Verarbeite jede Spalte separat
        column_markdown = []
        for column_idx, column_blocks in enumerate(columns):
            # Erstelle ein 'page_text'-ähnliches Dictionary für die Spalte
            column_text = {
                'blocks': [block for _, block in column_blocks],
                'width': column_width
            }
            
            # Filtere Tabellen und Bilder für diese Spalte
            column_tables = []
            for table in tables:
                table_x_mid = (table['bbox'][0] + table['bbox'][2]) / 2
                table_column_idx = int(table_x_mid / column_width)
                if table_column_idx == column_idx:
                    column_tables.append(table)
            
            column_images = []
            for image in images:
                image_x_mid = (image['bbox'][0] + image['bbox'][2]) / 2
                image_column_idx = int(image_x_mid / column_width)
                if image_column_idx == column_idx:
                    column_images.append(image)
            
            # Verarbeite die Spalte als einzelne Spalte
            column_markdown.append(self._process_single_column(column_text, doc_structure, column_tables, column_images))
        
        # Kombiniere die Spalten
        # Wir verwenden einen Markdown-Kommentar als Spaltenindikator, da Markdown selbst keine Spalten unterstützt
        result = []
        for idx, markdown in enumerate(column_markdown):
            if markdown.strip():
                result.append(f"<!-- Spalte {idx+1} -->\n\n{markdown}\n\n<!-- Ende Spalte {idx+1} -->")
        
        return "\n\n".join(result)
    
    def _extract_tables(self, page: fitz.Page, page_num: int, pdf_path: str, 
                       processed_tables: Set[Tuple[int, Tuple[float, float, float, float]]]) -> List[Dict[str, Any]]:
        """
        Extrahiert Tabellen von einer PDF-Seite.
        
        Args:
            page: PyMuPDF-Seite
            page_num: Seitennummer
            pdf_path: Pfad zur PDF-Datei
            processed_tables: Set von bereits verarbeiteten Tabellen (zur Vermeidung von Duplikaten)
            
        Returns:
            Liste der erkannten Tabellen mit Markdown-Darstellung
        """
        tables = []
        
        try:
            # Bestimme die zu verwendende Tabellenerkennung
            if self.table_detection_method == 'camelot' or self.table_detection_method == 'hybrid':
                try:
                    # Versuche Tabellen mit Camelot zu erkennen
                    camelot_tables = camelot.read_pdf(
                        pdf_path, 
                        pages=str(page_num + 1),  # Camelot verwendet 1-basierte Seitenzahlen
                        flavor='lattice'  # Für Tabellen mit Linien
                    )
                    
                    if len(camelot_tables) == 0:
                        # Versuche mit Stream-Flavor (für Tabellen ohne Linien)
                        camelot_tables = camelot.read_pdf(
                            pdf_path,
                            pages=str(page_num + 1),
                            flavor='stream'
                        )
                    
                    # Verarbeite die erkannten Tabellen
                    for i, table in enumerate(camelot_tables):
                        # Prüfe Qualität der Tabelle
                        if table.accuracy < self.table_confidence_threshold * 100:
                            continue
                        
                        # Hole die Bounding Box
                        table_bbox = table._bbox
                        
                        # Prüfe, ob die Tabelle bereits verarbeitet wurde
                        table_key = (page_num, table_bbox)
                        if table_key in processed_tables:
                            continue
                        
                        processed_tables.add(table_key)
                        
                        # Konvertiere die Tabelle in Markdown
                        df = table.df
                        markdown_table = self._dataframe_to_markdown(df)
                        
                        tables.append({
                            'page': page_num,
                            'bbox': table_bbox,
                            'markdown': markdown_table,
                            'method': 'camelot'
                        })
                
                except Exception as e:
                    self.logger.warning(f"Fehler bei Camelot-Tabellenerkennung: {e}")
            
            if (self.table_detection_method == 'tabula' or self.table_detection_method == 'hybrid') and not tables:
                try:
                    # Versuche Tabellen mit Tabula zu erkennen
                    tabula_tables = tabula.read_pdf(
                        pdf_path,
                        pages=page_num + 1,  # Tabula verwendet 1-basierte Seitenzahlen
                        multiple_tables=True
                    )
                    
                    # Verarbeite die erkannten Tabellen
                    for i, df in enumerate(tabula_tables):
                        # Prüfe Größe der Tabelle
                        if len(df) < self.min_table_rows or len(df.columns) < self.min_table_columns:
                            continue
                        
                        # Für Tabula haben wir keine genaue Bounding Box, verwenden stattdessen eine approximierte
                        # basierend auf der Tabellenposition in der Seite
                        approx_bbox = (50, 100 + i * 200, page.rect.width - 50, 200 + i * 200)
                        
                        # Prüfe, ob die Tabelle bereits verarbeitet wurde (approximiert)
                        found_duplicate = False
                        for existing_page, existing_bbox in processed_tables:
                            if existing_page == page_num and abs(existing_bbox[1] - approx_bbox[1]) < 100:
                                found_duplicate = True
                                break
                        
                        if found_duplicate:
                            continue
                        
                        processed_tables.add((page_num, approx_bbox))
                        
                        # Konvertiere die Tabelle in Markdown
                        markdown_table = self._dataframe_to_markdown(df)
                        
                        tables.append({
                            'page': page_num,
                            'bbox': approx_bbox,
                            'markdown': markdown_table,
                            'method': 'tabula'
                        })
                
                except Exception as e:
                    self.logger.warning(f"Fehler bei Tabula-Tabellenerkennung: {e}")
            
            # Eigene heuristische Tabellenerkennung als Fallback
            if not tables:
                # Versuche Tabellen heuristisch zu erkennen
                page_text = page.get_text()
                
                # Einfache Heuristik: Suche nach Zeilen mit mehreren Pipe-Zeichen oder Tabulatoren
                pipe_lines = [line for line in page_text.split('\n') if line.count('|') >= 3]
                tab_lines = [line for line in page_text.split('\n') if line.count('\t') >= 2]
                
                if pipe_lines or tab_lines:
                    # Verwende die erste gefundene Kandidatengruppe
                    candidate_lines = pipe_lines if pipe_lines else tab_lines
                    delimiter = '|' if pipe_lines else '\t'
                    
                    # Gruppiere zusammenhängende Zeilen
                    table_groups = []
                    current_group = []
                    
                    for i, line in enumerate(page_text.split('\n')):
                        if line in candidate_lines:
                            current_group.append(line)
                        elif current_group:
                            # Gruppe abschließen, wenn aktuelle Zeile kein Kandidat ist
                            if len(current_group) >= self.min_table_rows:
                                table_groups.append(current_group)
                            current_group = []
                    
                    # Letzte Gruppe hinzufügen, falls vorhanden
                    if current_group and len(current_group) >= self.min_table_rows:
                        table_groups.append(current_group)
                    
                    # Verarbeite jede Tabellengruppe
                    for group_idx, group in enumerate(table_groups):
                        # Bestimme die Anzahl der Spalten
                        col_counts = [len(re.split(re.escape(delimiter), line)) for line in group]
                        if not col_counts:
                            continue
                        
                        most_common_cols = max(set(col_counts), key=col_counts.count)
                        
                        if most_common_cols < self.min_table_columns:
                            continue
                        
                        # Erstelle Markdown-Tabelle
                        markdown_rows = []
                        
                        # Header
                        header_parts = re.split(re.escape(delimiter), group[0])
                        header_row = '| ' + ' | '.join(part.strip() for part in header_parts) + ' |'
                        markdown_rows.append(header_row)
                        
                        # Trennzeile
                        separator_row = '| ' + ' | '.join(['---'] * len(header_parts)) + ' |'
                        markdown_rows.append(separator_row)
                        
                        # Datenzeilen
                        for line in group[1:]:
                            parts = re.split(re.escape(delimiter), line)
                            
                            # Stelle sicher, dass wir die richtige Anzahl von Teilen haben
                            if len(parts) != len(header_parts):
                                # Fülle fehlende Spalten auf oder kürze überzählige
                                if len(parts) < len(header_parts):
                                    parts.extend([''] * (len(header_parts) - len(parts)))
                                else:
                                    parts = parts[:len(header_parts)]
                            
                            data_row = '| ' + ' | '.join(part.strip() for part in parts) + ' |'
                            markdown_rows.append(data_row)
                        
                        # Approximierte Bounding Box
                        approx_bbox = (50, 100 + group_idx * 200, page.rect.width - 50, 200 + group_idx * 200)
                        
                        # Prüfe, ob die Tabelle bereits verarbeitet wurde
                        if (page_num, approx_bbox) in processed_tables:
                            continue
                        
                        processed_tables.add((page_num, approx_bbox))
                        
                        tables.append({
                            'page': page_num,
                            'bbox': approx_bbox,
                            'markdown': '\n'.join(markdown_rows),
                            'method': 'heuristic'
                        })
        
        except Exception as e:
            self.logger.error(f"Fehler bei der Tabellenerkennung: {e}", exc_info=True)
        
        return tables
    
    def _dataframe_to_markdown(self, df) -> str:
        """
        Konvertiert einen Pandas DataFrame in eine Markdown-Tabelle.
        
        Args:
            df: Pandas DataFrame
            
        Returns:
            Markdown-Tabelle
        """
        # Überprüfe, ob der DataFrame leer ist
        if df.empty:
            return ""
        
        # Erstelle Header-Zeile
        header = '| ' + ' | '.join(str(col) for col in df.columns) + ' |'
        
        # Erstelle Trennzeile
        separator = '| ' + ' | '.join(['---'] * len(df.columns)) + ' |'
        
        # Erstelle Datenzeilen
        rows = []
        for _, row in df.iterrows():
            # Stelle sicher, dass alle Werte Strings sind
            values = [str(val).replace('\n', ' ').replace('\r', '') for val in row]
            rows.append('| ' + ' | '.join(values) + ' |')
        
        # Kombiniere alle Teile
        return '\n'.join([header, separator] + rows)
    
    def _extract_images(self, page: fitz.Page, page_num: int, assets_dir: Path, start_count: int) -> List[Dict[str, Any]]:
        """
        Extrahiert Bilder von einer PDF-Seite.
        
        Args:
            page: PyMuPDF-Seite
            page_num: Seitennummer
            assets_dir: Verzeichnis für extrahierte Assets
            start_count: Startwert für die Bildzählung
            
        Returns:
            Liste der extrahierten Bilder mit Pfaden und Metadaten
        """
        images = []
        image_count = start_count
        
        try:
            # Hole alle Bilder auf der Seite
            img_list = page.get_images(full=True)
            
            for img_idx, img_info in enumerate(img_list):
                try:
                    xref = img_info[0]  # Referenz-ID des Bildes
                    base_image = page.parent.extract_image(xref)
                    
                    if not base_image:
                        continue
                    
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]
                    
                    # Ignoriere sehr kleine Bilder (wahrscheinlich Icons oder Hintergrundgrafiken)
                    pil_img = Image.open(io.BytesIO(image_bytes))
                    width, height = pil_img.size
                    
                    if width < 50 or height < 50:
                        continue
                    
                    # Skaliere große Bilder herunter
                    if width > self.max_image_size or height > self.max_image_size:
                        scale_factor = min(self.max_image_size / width, self.max_image_size / height)
                        new_width = int(width * scale_factor)
                        new_height = int(height * scale_factor)
                        pil_img = pil_img.resize((new_width, new_height), Image.LANCZOS)
                        
                        # Konvertiere zurück zu Bytes
                        buffer = io.BytesIO()
                        pil_img.save(buffer, format=image_ext.upper())
                        image_bytes = buffer.getvalue()
                    
                    # Generiere Dateiname für das Bild
                    image_filename = f"image_{page_num+1}_{image_count+1}.{image_ext}"
                    image_path = assets_dir / image_filename
                    
                    # Speichere das Bild
                    with open(image_path, "wb") as f:
                        f.write(image_bytes)
                    
                    # Finde die Position des Bildes auf der Seite
                    for img_rect in page.get_image_rects(xref):
                        bbox = (img_rect.x0, img_rect.y0, img_rect.x1, img_rect.y1)
                        images.append({
                            'path': f"assets/{image_filename}",
                            'bbox': bbox,
                            'width': width,
                            'height': height,
                            'page': page_num,
                            'alt': f"Bild {page_num+1}-{image_count+1}"
                        })
                        break
                    
                    image_count += 1
                
                except Exception as e:
                    self.logger.warning(f"Fehler beim Extrahieren des Bildes {img_idx} auf Seite {page_num+1}: {e}")
        
        except Exception as e:
            self.logger.error(f"Fehler beim Extrahieren von Bildern auf Seite {page_num+1}: {e}", exc_info=True)
        
        return images
    
    def _format_toc(self, toc: List[List[Any]]) -> str:
        """
        Formatiert das Inhaltsverzeichnis als Markdown.
        
        Args:
            toc: PyMuPDF-Inhaltsverzeichnis
            
        Returns:
            Markdown-Inhaltsverzeichnis
        """
        if not toc:
            return ""
        
        markdown_parts = ["## Inhaltsverzeichnis\n"]
        
        for item in toc:
            if len(item) >= 3:  # level, title, page
                level, title, _ = item[:3]
                indent = "  " * (level - 1)
                markdown_parts.append(f"{indent}* {title}")
        
        return "\n".join(markdown_parts)


if __name__ == "__main__":
    # Setup Logging
    logging.basicConfig(level=logging.INFO, 
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Test des PDF-Konverters
    import sys
    
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        target_dir = sys.argv[2] if len(sys.argv) > 2 else "output"
        
        converter = PDFConverter()
        result = converter.convert(pdf_path, target_dir)
        
        if result['success']:
            print(f"Konvertierung erfolgreich: {result['target']}")
        else:
            print(f"Fehler bei der Konvertierung: {result.get('error', 'Unbekannter Fehler')}")
    else:
        print("Verwendung: python pdf_converter.py <pdf_datei> [ziel_verzeichnis]")