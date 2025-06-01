#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Nachkonsolidierungsskript für die Dokumentation des nscale DMS Assistenten.
Dieses Skript verarbeitet die verbleibenden Dokumentationsdateien im Hauptverzeichnis.
"""

import os
import sys
import logging
import argparse
import subprocess
import shutil
from pathlib import Path
import datetime

# Konfiguration des Loggings
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Konfiguration der Dateiumzüge
FILE_MAPPING = {
    "00_DOKUMENTATION_UEBERSICHT.md": "docs/00_DOKUMENTATION_UEBERSICHT.md",
    "01_VUE3_SFC_MIGRATION_STRATEGIE.md": "docs/03_MIGRATION/01_VUE_SFC_STRATEGIE.md",
    "03_LEKTIONEN_VUE_JS_MIGRATION.md": "docs/03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md",
    "05_VUE_MIGRATION_LESSONS_AND_CLEANUP.md": "docs/03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md",
    "09_ENTWICKLUNGSANLEITUNG.md": "docs/02_ENTWICKLUNG/04_ENTWICKLUNGSANLEITUNG.md",
    "COMPONENT_STRUCTURE.md": "docs/01_ARCHITEKTUR/03_KOMPONENTEN_STRUKTUR.md",
    "FEHLERANALYSE.md": "docs/05_REFERENZEN/06_FEHLERANALYSE.md",
    "SYSTEM_ARCHITEKTUR.md": "docs/01_ARCHITEKTUR/01_SYSTEM_ARCHITEKTUR.md",
    "TESTING.md": "docs/02_ENTWICKLUNG/05_TESTEN.md",
    "TEST_README.md": "docs/02_ENTWICKLUNG/05_TESTEN.md"
}

# Dateien, die zusammenzuführen sind
MERGE_GROUPS = {
    "docs/03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md": [
        "03_LEKTIONEN_VUE_JS_MIGRATION.md",
        "05_VUE_MIGRATION_LESSONS_AND_CLEANUP.md"
    ],
    "docs/02_ENTWICKLUNG/05_TESTEN.md": [
        "TESTING.md",
        "TEST_README.md"
    ]
}

def is_git_repo():
    """Prüft, ob das aktuelle Verzeichnis ein Git-Repository ist."""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--is-inside-work-tree'],
            capture_output=True,
            text=True,
            check=False
        )
        return result.returncode == 0 and result.stdout.strip() == 'true'
    except Exception:
        return False

def move_file_with_git(source, destination, dry_run=False):
    """Verschiebt eine Datei und erhält die Git-Historie."""
    source_path = os.path.abspath(source)
    dest_path = os.path.abspath(destination)
    
    if not os.path.exists(source_path):
        logger.warning(f"Quelldatei existiert nicht: {source_path}")
        return False
    
    # Stellen Sie sicher, dass das Zielverzeichnis existiert
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    logger.debug(f"Verzeichnis erstellt: {os.path.dirname(dest_path)}")
    
    if dry_run:
        logger.info(f"[TROCKEN] Würde verschieben: {source} -> {destination}")
        return True
    
    if os.path.exists(dest_path):
        logger.warning(f"Zieldatei existiert bereits: {dest_path}")
    
    try:
        # Git-Befehl zum Verschieben ausführen
        git_command = ['git', 'mv', source_path, dest_path]
        result = subprocess.run(git_command, capture_output=True, text=True, check=False)
        
        if result.returncode != 0:
            logger.warning(f"Git-Fehler: {result.stderr}")
            logger.info(f"Verwende Fallback: Normale Dateioperation für {source} -> {destination}")
            
            # Fallback: Normale Dateioperation
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(source_path, dest_path)
            
            # Die Quelldatei entfernen wir hier nicht, da wir bei Fehler vorsichtig sein sollten
            # Die Konsolidierungsdatei wird aber erstellt
        else:
            logger.info(f"Datei verschoben (git): {source} -> {destination}")
        
        return True
    except Exception as e:
        logger.error(f"Fehler beim Verschieben von {source} nach {destination}: {e}")
        return False

def read_file_content(file_path):
    """Liest den Inhalt einer Datei."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        logger.error(f"Fehler beim Lesen der Datei {file_path}: {e}")
        return ""

def merge_files(files, destination, dry_run=False):
    """Führt mehrere Dateien zu einer zusammen."""
    merged_content = []
    file_titles = {}
    
    # Header für die zusammengeführte Datei
    merged_header = f"""# {os.path.splitext(os.path.basename(destination))[0].replace('_', ' ').replace('0', '').strip()}

*Zusammengeführt aus mehreren Quelldateien am {datetime.datetime.now().strftime('%d.%m.%Y')}*

---

"""
    merged_content.append(merged_header)
    
    for file_path in files:
        if not os.path.exists(file_path):
            logger.warning(f"Datei existiert nicht für Zusammenführung: {file_path}")
            continue
        
        content = read_file_content(file_path)
        
        # Extrahiere Titel für Quellhinweis
        file_basename = os.path.basename(file_path)
        first_line = content.strip().split('\n')[0] if content else ""
        title = first_line.replace('#', '').strip() if first_line.startswith('#') else file_basename
        file_titles[file_path] = title
        
        section_header = f"""## Aus: {title}

*Ursprüngliche Datei: {file_basename}*

"""
        merged_content.append(section_header)
        merged_content.append(content)
        merged_content.append("\n---\n\n")
    
    final_content = '\n'.join(merged_content)
    
    if dry_run:
        logger.info(f"[TROCKEN] Würde Dateien zusammenführen: {', '.join([os.path.basename(f) for f in files])} -> {destination}")
        logger.debug(f"[TROCKEN] Zusammengeführter Inhalt hätte {len(final_content)} Zeichen")
        return True
    
    try:
        # Stelle sicher, dass das Zielverzeichnis existiert
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        
        if os.path.exists(destination):
            # Wenn die Zieldatei existiert, fügen wir den Inhalt an
            with open(destination, 'a', encoding='utf-8') as file:
                file.write(f"\n\n{final_content}")
            logger.info(f"Dateien zusammengeführt: {', '.join([os.path.basename(f) for f in files])} -> {destination}")
        else:
            # Sonst erstellen wir eine neue Datei
            with open(destination, 'w', encoding='utf-8') as file:
                file.write(final_content)
            logger.info(f"Dateien zusammengeführt: {', '.join([os.path.basename(f) for f in files])} -> {destination}")
        
        return True
    except Exception as e:
        logger.error(f"Fehler beim Zusammenführen der Dateien zu {destination}: {e}")
        return False

def update_toc(file_path, dry_run=False):
    """Aktualisiert das Inhaltsverzeichnis in der README.md-Datei."""
    if dry_run:
        logger.info(f"[TROCKEN] Würde Inhaltsverzeichnis aktualisieren: {file_path}")
        return True
    
    try:
        # Hier fügen wir die neu hinzugefügten Dateien zum Inhaltsverzeichnis hinzu
        content = read_file_content(file_path)
        
        # Ergänzen Sie den Entwicklungsbereich
        new_content = content.replace(
            "- [API INTEGRATION](02_ENTWICKLUNG/03_API_INTEGRATION.md) - Integration der API",
            """- [API INTEGRATION](02_ENTWICKLUNG/03_API_INTEGRATION.md) - Integration der API
- [ENTWICKLUNGSANLEITUNG](02_ENTWICKLUNG/04_ENTWICKLUNGSANLEITUNG.md) - Detaillierte Anleitung für Entwickler
- [TESTEN](02_ENTWICKLUNG/05_TESTEN.md) - Testkonzept und Testmethoden"""
        )
        
        # Ergänzen Sie den Architekturbereich
        new_content = new_content.replace(
            "- [FRONTEND ARCHITEKTUR](01_ARCHITEKTUR/02_FRONTEND_ARCHITEKTUR.md) - Architektur des Frontend-Systems",
            """- [FRONTEND ARCHITEKTUR](01_ARCHITEKTUR/02_FRONTEND_ARCHITEKTUR.md) - Architektur des Frontend-Systems
- [KOMPONENTEN STRUKTUR](01_ARCHITEKTUR/03_KOMPONENTEN_STRUKTUR.md) - Struktur der Frontend-Komponenten"""
        )
        
        # Ergänzen Sie den Referenzbereich
        new_content = new_content.replace(
            "- [DATENPERSISTENZ](05_REFERENZEN/05_DATENPERSISTENZ.md) - Datenpersistenzmechanismen",
            """- [DATENPERSISTENZ](05_REFERENZEN/05_DATENPERSISTENZ.md) - Datenpersistenzmechanismen
- [FEHLERANALYSE](05_REFERENZEN/06_FEHLERANALYSE.md) - Methoden zur Analyse von Fehlern"""
        )
        
        # Aktualisieren Sie das Datum
        new_content = new_content.replace(
            f"*Letzte Aktualisierung: {datetime.datetime.now().strftime('%d.%m.%Y')}*",
            f"*Letzte Aktualisierung: {datetime.datetime.now().strftime('%d.%m.%Y')}*"
        )
        
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(new_content)
        
        logger.info(f"Inhaltsverzeichnis aktualisiert: {file_path}")
        return True
    except Exception as e:
        logger.error(f"Fehler beim Aktualisieren des Inhaltsverzeichnisses: {e}")
        return False

def update_consolidation_log(file_path, moved_files, merged_files, dry_run=False):
    """Aktualisiert das Konsolidierungsprotokoll."""
    if dry_run:
        logger.info(f"[TROCKEN] Würde Konsolidierungsprotokoll aktualisieren: {file_path}")
        return True
    
    try:
        with open(file_path, 'a', encoding='utf-8') as file:
            file.write("\n\n## Nachkonsolidierung - " + datetime.datetime.now().strftime('%d.%m.%Y %H:%M:%S') + "\n\n")
            
            # Verschobene Dateien
            if moved_files:
                file.write("### Zusätzlich verschobene Dateien\n\n")
                for source, dest in moved_files:
                    file.write(f"- {source} -> {dest}\n")
                file.write("\n")
            
            # Zusammengeführte Dateien
            if merged_files:
                file.write("### Zusätzlich zusammengeführte Dateien\n\n")
                for dest, sources in merged_files.items():
                    file.write(f"- Ziel: {dest}\n")
                    for source in sources:
                        file.write(f"  - Quelle: {source}\n")
                    file.write("\n")
        
        logger.info(f"Konsolidierungsprotokoll aktualisiert: {file_path}")
        return True
    except Exception as e:
        logger.error(f"Fehler beim Aktualisieren des Konsolidierungsprotokolls: {e}")
        return False

def main():
    """Hauptfunktion des Skripts."""
    parser = argparse.ArgumentParser(description='Nachkonsolidierungsskript für nscale DMS Assistent Dokumentation')
    parser.add_argument('--dry-run', action='store_true', help='Nur Ausgabe, keine Änderungen vornehmen')
    parser.add_argument('--verbose', '-v', action='store_true', help='Ausführliche Ausgabe')
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    logger.info("Starte Dokumentations-Nachkonsolidierung...")
    
    is_git = is_git_repo()
    if not is_git:
        logger.warning("Kein Git-Repository gefunden. Git-Befehle werden übersprungen.")
    
    moved_files = []
    merged_groups = {}
    
    # Verschieben von Dateien
    for source, destination in FILE_MAPPING.items():
        if os.path.exists(source):
            if move_file_with_git(source, destination, args.dry_run):
                moved_files.append((source, destination))
    
    # Zusammenführen von Dateien
    for destination, sources in MERGE_GROUPS.items():
        valid_sources = [s for s in sources if os.path.exists(s)]
        if valid_sources:
            if merge_files(valid_sources, destination, args.dry_run):
                merged_groups[destination] = valid_sources
    
    # Aktualisieren des Inhaltsverzeichnisses
    update_toc("docs/README.md", args.dry_run)
    
    # Aktualisieren des Konsolidierungsprotokolls
    update_consolidation_log("docs/KONSOLIDIERUNG_LOG.md", moved_files, merged_groups, args.dry_run)
    
    if args.dry_run:
        logger.info("Trockenlauf abgeschlossen. Keine Änderungen wurden vorgenommen.")
    else:
        logger.info("Dokumentations-Nachkonsolidierung abgeschlossen.")
        logger.info(f"  - {len(moved_files)} zusätzliche Dateien verschoben")
        logger.info(f"  - {len(merged_groups)} Zieldateien aus weiteren Quelldateien zusammengeführt")
        logger.info("Inhaltsverzeichnis aktualisiert in docs/README.md")
        logger.info("Änderungsprotokoll aktualisiert in docs/KONSOLIDIERUNG_LOG.md")

if __name__ == "__main__":
    main()