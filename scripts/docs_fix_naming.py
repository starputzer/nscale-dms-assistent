#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Namenskorrekturskript für die Dokumentation des nscale DMS Assistenten.
Dieses Skript korrigiert die Benennungen der Dokumentationsdateien im Hauptverzeichnis.
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
    "DIALOG_SYSTEM.md": "06_SYSTEME/01_DIALOG_SYSTEM.md",
    "DOCUMENT_CONVERTER_STORE.md": "06_SYSTEME/02_DOCUMENT_CONVERTER_STORE.md",
    "FEATURE_TOGGLE_SYSTEM.md": "06_SYSTEME/03_FEATURE_TOGGLE_SYSTEM.md",
    "FILE_UPLOAD_COMPONENT.md": "06_SYSTEME/04_FILE_UPLOAD_COMPONENT.md",
    "STATE_FLOW_DIAGRAM.md": "06_SYSTEME/05_STATE_FLOW_DIAGRAM.md",
    "VUE3_SFC_DOKUMENTENKONVERTER.md": "06_SYSTEME/06_VUE3_SFC_DOKUMENTENKONVERTER.md",
    "KONSOLIDIERUNG_LOG.md": "99_VERWALTUNG/01_KONSOLIDIERUNG_LOG.md"
}

# Dateien, die im Hauptverzeichnis bleiben sollten
KEEP_FILES = [
    "README.md",
    "00_DOKUMENTATION_UEBERSICHT.md",
    "00_PROJEKT_UEBERBLICK.md",
    "00_ROADMAP.md"
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

def update_toc(file_path, dry_run=False):
    """Aktualisiert das Inhaltsverzeichnis in der README.md-Datei."""
    if dry_run:
        logger.info(f"[TROCKEN] Würde Inhaltsverzeichnis aktualisieren: {file_path}")
        return True
    
    try:
        # Datei lesen
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Neue Sektion hinzufügen
        if "### Systeme und Komponenten" not in content:
            # Einfügen nach der letzten vorhandenen Sektion
            new_content = content.replace(
                "### Referenzen",
                """### Referenzen""")
            
            # Füge die neue Sektion nach Referenzen hinzu
            new_content = new_content.replace(
                """- [DATENPERSISTENZ](05_REFERENZEN/05_DATENPERSISTENZ.md) - Datenpersistenzmechanismen
- [FEHLERANALYSE](05_REFERENZEN/06_FEHLERANALYSE.md) - Methoden zur Analyse von Fehlern""",
                """- [DATENPERSISTENZ](05_REFERENZEN/05_DATENPERSISTENZ.md) - Datenpersistenzmechanismen
- [FEHLERANALYSE](05_REFERENZEN/06_FEHLERANALYSE.md) - Methoden zur Analyse von Fehlern

### Systeme und Komponenten

- [DIALOG SYSTEM](06_SYSTEME/01_DIALOG_SYSTEM.md) - Dialogsystem für Benutzerinteraktionen
- [DOCUMENT CONVERTER STORE](06_SYSTEME/02_DOCUMENT_CONVERTER_STORE.md) - Store für den Dokumentenkonverter
- [FEATURE TOGGLE SYSTEM](06_SYSTEME/03_FEATURE_TOGGLE_SYSTEM.md) - System zur Steuerung von Features
- [FILE UPLOAD COMPONENT](06_SYSTEME/04_FILE_UPLOAD_COMPONENT.md) - Komponente für Datei-Uploads
- [STATE FLOW DIAGRAM](06_SYSTEME/05_STATE_FLOW_DIAGRAM.md) - Diagramm des Zustandsflusses
- [VUE3 SFC DOKUMENTENKONVERTER](06_SYSTEME/06_VUE3_SFC_DOKUMENTENKONVERTER.md) - Vue 3 SFC-Implementierung des Dokumentenkonverters"""
            )
            
            # Aktualisiere das Datum
            new_content = new_content.replace(
                f"*Letzte Aktualisierung: {datetime.datetime.now().strftime('%d.%m.%Y')}*",
                f"*Letzte Aktualisierung: {datetime.datetime.now().strftime('%d.%m.%Y')}*"
            )
            
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(new_content)
            
            logger.info(f"Inhaltsverzeichnis aktualisiert: {file_path}")
        else:
            logger.info(f"Inhaltsverzeichnis bereits aktuell: {file_path}")
        
        return True
    except Exception as e:
        logger.error(f"Fehler beim Aktualisieren des Inhaltsverzeichnisses: {e}")
        return False

def update_consolidation_log(file_path, moved_files, dry_run=False):
    """Aktualisiert das Konsolidierungsprotokoll."""
    if dry_run:
        logger.info(f"[TROCKEN] Würde Konsolidierungsprotokoll aktualisieren: {file_path}")
        return True
    
    try:
        with open(file_path, 'a', encoding='utf-8') as file:
            file.write("\n\n## Namenskorrektur - " + datetime.datetime.now().strftime('%d.%m.%Y %H:%M:%S') + "\n\n")
            
            # Verschobene Dateien
            if moved_files:
                file.write("### Umbenannte Dateien\n\n")
                for source, dest in moved_files:
                    file.write(f"- {source} -> {dest}\n")
                file.write("\n")
                file.write("Die Dateien wurden nach der Namenskonvention in entsprechende Unterverzeichnisse verschoben.\n")
        
        logger.info(f"Konsolidierungsprotokoll aktualisiert: {file_path}")
        return True
    except Exception as e:
        logger.error(f"Fehler beim Aktualisieren des Konsolidierungsprotokolls: {e}")
        return False

def main():
    """Hauptfunktion des Skripts."""
    parser = argparse.ArgumentParser(description='Namenskorrekturskript für nscale DMS Assistent Dokumentation')
    parser.add_argument('--dry-run', action='store_true', help='Nur Ausgabe, keine Änderungen vornehmen')
    parser.add_argument('--verbose', '-v', action='store_true', help='Ausführliche Ausgabe')
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    logger.info("Starte Dokumentations-Namenskorrektur...")
    
    is_git = is_git_repo()
    if not is_git:
        logger.warning("Kein Git-Repository gefunden. Git-Befehle werden übersprungen.")
    
    os.chdir("/opt/nscale-assist/app")
    moved_files = []
    
    # Verschieben von Dateien gemäß der Namenskonvention
    for source, destination in FILE_MAPPING.items():
        full_source = os.path.join("docs", source)
        full_dest = os.path.join("docs", destination)
        if os.path.exists(full_source):
            if move_file_with_git(full_source, full_dest, args.dry_run):
                moved_files.append((full_source, full_dest))
                logger.info(f"Datei verschoben: {full_source} -> {full_dest}")
    
    # Aktualisieren des Inhaltsverzeichnisses
    update_toc("docs/README.md", args.dry_run)
    
    # Aktualisieren des Konsolidierungsprotokolls
    update_consolidation_log("docs/99_VERWALTUNG/01_KONSOLIDIERUNG_LOG.md", moved_files, args.dry_run)
    
    if args.dry_run:
        logger.info("Trockenlauf abgeschlossen. Keine Änderungen wurden vorgenommen.")
    else:
        logger.info("Dokumentations-Namenskorrektur abgeschlossen.")
        logger.info(f"  - {len(moved_files)} Dateien nach Namenskonvention verschoben")
        logger.info("Inhaltsverzeichnis aktualisiert in docs/README.md")
        logger.info("Änderungsprotokoll aktualisiert in docs/99_VERWALTUNG/01_KONSOLIDIERUNG_LOG.md")

if __name__ == "__main__":
    main()