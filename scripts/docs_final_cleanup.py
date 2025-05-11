#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Finales Bereinigungsskript für die Dokumentation des nscale DMS Assistenten.
Dieses Skript verarbeitet die verbliebenen Dokumentationsdateien im Hauptverzeichnis.
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
    "01_VUE3_SFC_MIGRATION_STRATEGIE.md": "docs/03_MIGRATION/01_VUE_SFC_STRATEGIE.md",
    "03_LEKTIONEN_VUE_JS_MIGRATION.md": "docs/03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md",
    "05_VUE_MIGRATION_LESSONS_AND_CLEANUP.md": "docs/03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md",
    "SYSTEM_ARCHITEKTUR.md": "docs/01_ARCHITEKTUR/01_SYSTEM_ARCHITEKTUR.md",
    "TEST_README.md": "docs/02_ENTWICKLUNG/05_TESTEN.md",
    "ROADMAP.md": "docs/00_ROADMAP.md",
    "ROLLENKONZEPT.md": "docs/04_FEATURES/02_ROLLENKONZEPT.md"
}

# Dateien, die im Hauptverzeichnis bleiben sollten
KEEP_FILES = [
    "README.md",
    "CONTRIBUTING.md",
    "SECURITY.md"
]

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
        logger.info(f"Führe Inhalte zusammen für: {source} -> {destination}")
        try:
            with open(source_path, 'r', encoding='utf-8') as src_file:
                src_content = src_file.read()
            
            with open(dest_path, 'a', encoding='utf-8') as dest_file:
                dest_file.write('\n\n## Hinzugefügt aus: ' + os.path.basename(source_path) + '\n\n')
                dest_file.write(src_content)
            
            logger.info(f"Inhalte zusammengeführt: {source} -> {destination}")
            
            # Quelldatei löschen
            os.remove(source_path)
            logger.info(f"Quelldatei nach Zusammenführung gelöscht: {source}")
            
            return True
        except Exception as e:
            logger.error(f"Fehler beim Zusammenführen von {source} nach {destination}: {e}")
            return False
    
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
            
            # Die Quelldatei löschen
            os.remove(source_path)
            logger.info(f"Datei manuell verschoben: {source} -> {destination}")
        else:
            logger.info(f"Datei verschoben (git): {source} -> {destination}")
        
        return True
    except Exception as e:
        logger.error(f"Fehler beim Verschieben von {source} nach {destination}: {e}")
        return False

def create_symlink(source, target, dry_run=False):
    """Erstellt einen symbolischen Link."""
    source_path = os.path.abspath(source)
    target_path = os.path.abspath(target)
    
    if not os.path.exists(target_path):
        logger.warning(f"Zieldatei existiert nicht: {target_path}")
        return False
    
    if os.path.exists(source_path):
        logger.warning(f"Quelldatei existiert bereits: {source_path}")
        return False
    
    if dry_run:
        logger.info(f"[TROCKEN] Würde symbolischen Link erstellen: {source} -> {target}")
        return True
    
    try:
        # Relativen Pfad berechnen
        rel_path = os.path.relpath(target_path, os.path.dirname(source_path))
        
        # Symbolischen Link erstellen
        os.symlink(rel_path, source_path)
        logger.info(f"Symbolischer Link erstellt: {source} -> {target}")
        return True
    except Exception as e:
        logger.error(f"Fehler beim Erstellen des symbolischen Links {source} -> {target}: {e}")
        return False

def update_consolidation_log(file_path, moved_files, dry_run=False):
    """Aktualisiert das Konsolidierungsprotokoll."""
    if dry_run:
        logger.info(f"[TROCKEN] Würde Konsolidierungsprotokoll aktualisieren: {file_path}")
        return True
    
    try:
        with open(file_path, 'a', encoding='utf-8') as file:
            file.write("\n\n## Finale Bereinigung - " + datetime.datetime.now().strftime('%d.%m.%Y %H:%M:%S') + "\n\n")
            
            # Verschobene Dateien
            if moved_files:
                file.write("### Zusätzlich verschobene Dateien\n\n")
                for source, dest in moved_files:
                    file.write(f"- {source} -> {dest}\n")
                file.write("\n")
        
        logger.info(f"Konsolidierungsprotokoll aktualisiert: {file_path}")
        return True
    except Exception as e:
        logger.error(f"Fehler beim Aktualisieren des Konsolidierungsprotokolls: {e}")
        return False

def main():
    """Hauptfunktion des Skripts."""
    parser = argparse.ArgumentParser(description='Finales Bereinigungsskript für nscale DMS Assistent Dokumentation')
    parser.add_argument('--dry-run', action='store_true', help='Nur Ausgabe, keine Änderungen vornehmen')
    parser.add_argument('--verbose', '-v', action='store_true', help='Ausführliche Ausgabe')
    parser.add_argument('--symlinks', action='store_true', help='Symbolische Links für wichtige Dateien erstellen')
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    logger.info("Starte finale Dokumentationsbereinigung...")
    
    is_git = is_git_repo()
    if not is_git:
        logger.warning("Kein Git-Repository gefunden. Git-Befehle werden übersprungen.")
    
    moved_files = []
    
    # Verschieben von Dateien
    for source, destination in FILE_MAPPING.items():
        if os.path.exists(source):
            if move_file_with_git(source, destination, args.dry_run):
                moved_files.append((source, destination))
    
    # Symbolische Links erstellen, wenn gewünscht
    if args.symlinks and not args.dry_run:
        for source, destination in FILE_MAPPING.items():
            if not os.path.exists(source) and source not in ["SYSTEM_ARCHITEKTUR.md", "TEST_README.md"]:  # Nur für wichtige Dateien
                create_symlink(source, destination, args.dry_run)
    
    # Aktualisieren des Konsolidierungsprotokolls
    update_consolidation_log("docs/KONSOLIDIERUNG_LOG.md", moved_files, args.dry_run)
    
    if args.dry_run:
        logger.info("Trockenlauf abgeschlossen. Keine Änderungen wurden vorgenommen.")
    else:
        logger.info("Finale Dokumentationsbereinigung abgeschlossen.")
        logger.info(f"  - {len(moved_files)} zusätzliche Dateien verschoben")
        logger.info("Änderungsprotokoll aktualisiert in docs/KONSOLIDIERUNG_LOG.md")

if __name__ == "__main__":
    main()