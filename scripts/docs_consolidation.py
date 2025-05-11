#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dokumentationskonsolidierungsskript für nscale DMS Assistent

Dieses Skript analysiert und konsolidiert die Dokumentationsdateien des
nscale DMS Assistenten, um eine einheitliche, strukturierte Dokumentation
zu erstellen, die leichter zu navigieren und zu pflegen ist.

Funktionen:
1. Analyse aller Dokumentationsdateien
2. Identifizierung doppelter oder überlappender Dokumente
3. Konsolidierung zusammengehöriger Dokumente
4. Konsistente Namenskonvention mit numerischen Präfixen
5. Organisation in einer klaren Verzeichnisstruktur
6. Generierung eines Inhaltsverzeichnisses
7. Erhaltung der Git-Historie

Autor: Claude AI
Datum: 08.05.2025
"""

import os
import sys
import re
import shutil
import argparse
import logging
import difflib
import datetime
import subprocess
from collections import defaultdict
from typing import Dict, List, Tuple, Set, Optional


# Logging-Konfiguration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('docs_consolidation')

# Pfadkonfiguration
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DOCS_DIR = os.path.join(ROOT_DIR, 'docs')

# Dateizuordnungen (Quellpfad -> Zielpfad)
FILE_MAPPINGS = {
    # Projektübersicht
    '00_PROJEKT_OVERVIEW.md': 'docs/00_PROJEKT_UEBERBLICK.md',
    '00_PROJECT_OVERVIEW.md': 'docs/00_PROJEKT_UEBERBLICK.md',
    '01_ROADMAP.md': 'docs/00_ROADMAP.md',
    'ROADMAP.md': 'docs/00_ROADMAP.md',

    # Architektur
    '04_SYSTEM_ARCHITEKTUR.md': 'docs/01_ARCHITEKTUR/01_SYSTEM_ARCHITEKTUR.md',
    'SYSTEM_ARCHITEKTUR.md': 'docs/01_ARCHITEKTUR/01_SYSTEM_ARCHITEKTUR.md',
    '02_KOMPONENTEN_ARCHITEKTUR.md': 'docs/01_ARCHITEKTUR/02_FRONTEND_ARCHITEKTUR.md',

    # Entwicklung
    'docs/SETUP.md': 'docs/02_ENTWICKLUNG/01_SETUP.md',
    'docs/COMPONENT_GUIDE.md': 'docs/02_ENTWICKLUNG/02_KOMPONENTEN_LEITFADEN.md',
    'docs/API_INTEGRATION.md': 'docs/02_ENTWICKLUNG/03_API_INTEGRATION.md',
    '09_ENTWICKLUNGSANLEITUNG.md': 'docs/02_ENTWICKLUNG/01_SETUP.md',

    # Migration
    '02_VUE_SFC_MIGRATION_STRATEGY.md': 'docs/03_MIGRATION/01_VUE_SFC_STRATEGIE.md',
    '02_VUE_SFC_MIGRATION_STRATEGIE.md': 'docs/03_MIGRATION/01_VUE_SFC_STRATEGIE.md',
    '03_VUE_SFC_MIGRATION_STATUS.md': 'docs/03_MIGRATION/02_VUE_SFC_STATUS.md',
    '03_LEKTIONEN_FRAMEWORK_MIGRATION.md': 'docs/03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md',
    '03_LEKTIONEN_VUE_JS_MIGRATION.md': 'docs/03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md',
    '05_VUE_MIGRATION_LESSONS_AND_CLEANUP.md': 'docs/03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md',
    '04_VUE_SFC_MIGRATION_ACTION_PLAN.md': 'docs/03_MIGRATION/04_MIGRATIONS_AKTIONSPLAN.md',

    # Features
    '06_DOKUMENTENKONVERTER.md': 'docs/04_FEATURES/01_DOKUMENTENKONVERTER.md',
    '05_ROLLENKONZEPT.md': 'docs/04_FEATURES/02_ROLLENKONZEPT.md',
    'ROLLENKONZEPT.md': 'docs/04_FEATURES/02_ROLLENKONZEPT.md',

    # Referenzen
    'docs/STATE_MANAGEMENT.md': 'docs/05_REFERENZEN/01_STATE_MANAGEMENT.md',
    'docs/TYPESCRIPT_TYPES.md': 'docs/05_REFERENZEN/02_TYPESCRIPT_TYPEN.md',
    'docs/ERROR_HANDLING.md': 'docs/05_REFERENZEN/03_FEHLERBEHANDLUNG.md',
    'docs/API_CLIENT.md': 'docs/05_REFERENZEN/04_API_CLIENT.md',
    'docs/DATA_PERSISTENCE.md': 'docs/05_REFERENZEN/05_DATENPERSISTENZ.md',
}

# Dateien zum Zusammenführen (Gruppiert nach Ziel)
FILES_TO_MERGE = {
    'docs/00_ROADMAP.md': [
        '01_ROADMAP.md', 
        'ROADMAP.md'
    ],
    'docs/01_ARCHITEKTUR/01_SYSTEM_ARCHITEKTUR.md': [
        '04_SYSTEM_ARCHITEKTUR.md', 
        'SYSTEM_ARCHITEKTUR.md'
    ],
    'docs/02_ENTWICKLUNG/01_SETUP.md': [
        'docs/SETUP.md', 
        '09_ENTWICKLUNGSANLEITUNG.md'
    ],
    'docs/03_MIGRATION/03_MIGRATIONS_ERKENNTNISSE.md': [
        '03_LEKTIONEN_FRAMEWORK_MIGRATION.md', 
        '03_LEKTIONEN_VUE_JS_MIGRATION.md', 
        '05_VUE_MIGRATION_LESSONS_AND_CLEANUP.md'
    ],
    'docs/04_FEATURES/02_ROLLENKONZEPT.md': [
        '05_ROLLENKONZEPT.md', 
        'ROLLENKONZEPT.md'
    ],
}

# Dateien, die entfernt werden sollen
FILES_TO_REMOVE = [
    'PROJEKT_HISTORIE.md',
    'DOCUMENTATION_CHANGES.md',
    'DOCUMENTATION_UPDATE_SUMMARY.md',
    'DOCUMENTATION_CHECKLIST.md',
    '02_VANILLA_JS_IMPLEMENTIERUNG.md',
    '07_CHANGELOG.md',
    '08_FEHLERBEHEBUNG.md',
    'CHANGELOG.md',
    'CLEANUP_VUE.md',
    'docs/FRONTEND_FIXES.md',
    'docs/component_hierarchy.md',
    'docs/NPM_MODULE_INTEGRATION.md',
]

# Kategorien für das Inhaltsverzeichnis
CATEGORY_TITLES = {
    '00': 'Projektübersicht und Roadmap',
    '01_ARCHITEKTUR': 'Systemarchitektur',
    '02_ENTWICKLUNG': 'Entwicklungsleitfaden',
    '03_MIGRATION': 'Migrationsdokumentation',
    '04_FEATURES': 'Feature-Dokumentation',
    '05_REFERENZEN': 'Technische Referenzen',
}

def normalize_path(path: str) -> str:
    """Normalisiert einen Pfad relativ zum Wurzelverzeichnis."""
    if path.startswith('docs/'):
        return os.path.join(ROOT_DIR, path)
    return os.path.join(ROOT_DIR, path)

def get_file_content(file_path: str) -> str:
    """Liest den Inhalt einer Datei."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        logger.warning(f"Datei nicht gefunden: {file_path}")
        return ""
    except Exception as e:
        logger.error(f"Fehler beim Lesen von {file_path}: {e}")
        return ""

def similarity_ratio(text1: str, text2: str) -> float:
    """Berechnet die Ähnlichkeit zwischen zwei Texten."""
    # Einfacher Vergleich mit difflib
    return difflib.SequenceMatcher(None, text1, text2).ratio()

def create_directory(directory: str) -> None:
    """Erstellt ein Verzeichnis, falls es noch nicht existiert."""
    os.makedirs(directory, exist_ok=True)
    logger.debug(f"Verzeichnis erstellt: {directory}")

def move_file_with_git(source: str, destination: str, dry_run: bool = False) -> bool:
    """Verschiebt eine Datei und erhält die Git-Historie."""
    source_path = normalize_path(source)
    dest_path = normalize_path(destination)
    
    # Pfad splitten, um Verzeichnisse zu erstellen
    dest_dir = os.path.dirname(dest_path)
    create_directory(dest_dir)
    
    # Prüfen, ob die Quelldatei existiert
    if not os.path.exists(source_path):
        logger.warning(f"Quelldatei existiert nicht: {source_path}")
        return False
    
    # Prüfen, ob die Zieldatei bereits existiert
    if os.path.exists(dest_path):
        logger.warning(f"Zieldatei existiert bereits: {dest_path}")
        # Wir löschen sie nicht automatisch, da wir sie später vielleicht zusammenführen wollen
    
    if dry_run:
        logger.info(f"[TROCKEN] Würde verschieben: {source_path} -> {dest_path}")
        return True
    
    try:
        # Git-Befehl zum Verschieben ausführen
        git_command = ['git', 'mv', source_path, dest_path]
        result = subprocess.run(git_command, capture_output=True, text=True, check=False)
        
        if result.returncode != 0:
            logger.warning(f"Git-Fehler: {result.stderr}")
            # Fallback auf normales Kopieren
            logger.info(f"Verwende Fallback: Normale Dateioperation für {source} -> {destination}")
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(source_path, dest_path)
            # Fallbacks markieren wir zur späteren Information
            return False
        
        logger.info(f"Datei verschoben (git): {source} -> {destination}")
        return True
    except Exception as e:
        logger.error(f"Fehler beim Verschieben von {source} nach {destination}: {e}")
        return False

def merge_files(files: List[str], destination: str, dry_run: bool = False) -> bool:
    """Führt mehrere Dateien zu einer zusammen."""
    merged_content = []
    file_titles = {}
    
    # Header für die zusammengeführte Datei
    merged_header = f"""# {os.path.splitext(os.path.basename(destination))[0].replace('_', ' ').replace('0', '').strip()}

*Zusammengeführt aus mehreren Quelldateien am {datetime.datetime.now().strftime('%d.%m.%Y')}*

---

"""
    merged_content.append(merged_header)
    
    # Inhalte sammeln
    for file_path in files:
        abs_path = normalize_path(file_path)
        if not os.path.exists(abs_path):
            logger.warning(f"Datei für Zusammenführung nicht gefunden: {abs_path}")
            continue
        
        content = get_file_content(abs_path)
        
        # Titel extrahieren (erster Level-1-Header)
        title_match = re.search(r'^# (.+)$', content, re.MULTILINE)
        title = title_match.group(1) if title_match else os.path.basename(file_path)
        file_titles[file_path] = title
        
        # Abschnitt-Header für jede Quelldatei
        merged_content.append(f"## Aus {os.path.basename(file_path)}: {title}\n")
        
        # Hauptinhalt (ohne ersten Level-1-Header)
        if title_match:
            content = content.replace(title_match.group(0), "", 1).strip()
        
        merged_content.append(content)
        merged_content.append("\n\n---\n\n")
    
    # Letzten Trennstrich entfernen
    if merged_content and merged_content[-1] == "\n\n---\n\n":
        merged_content.pop()
    
    # Inhalte zusammenführen und in Zieldatei schreiben
    dest_path = normalize_path(destination)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    if dry_run:
        logger.info(f"[TROCKEN] Würde Dateien zusammenführen: {', '.join(files)} -> {destination}")
        logger.debug(f"[TROCKEN] Zusammengeführter Inhalt hätte {len(''.join(merged_content))} Zeichen")
        return True
    
    try:
        with open(dest_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(merged_content))
        logger.info(f"Dateien zusammengeführt: {', '.join(files)} -> {destination}")
        return True
    except Exception as e:
        logger.error(f"Fehler beim Zusammenführen in {destination}: {e}")
        return False

def analyze_duplicates(files: List[str], threshold: float = 0.8) -> Dict[str, List[str]]:
    """Identifiziert Duplikate basierend auf Inhaltsähnlichkeit."""
    similarity_groups = defaultdict(list)
    processed_files = []
    
    for i, file1 in enumerate(files):
        if file1 in processed_files:
            continue
            
        file1_path = normalize_path(file1)
        if not os.path.exists(file1_path):
            continue
            
        file1_content = get_file_content(file1_path)
        group_key = file1
        
        for file2 in files[i+1:]:
            if file2 in processed_files:
                continue
                
            file2_path = normalize_path(file2)
            if not os.path.exists(file2_path):
                continue
                
            file2_content = get_file_content(file2_path)
            sim_ratio = similarity_ratio(file1_content, file2_content)
            
            if sim_ratio > threshold:
                similarity_groups[group_key].append((file2, sim_ratio))
                processed_files.append(file2)
        
        if similarity_groups[group_key]:
            # Füge die Ursprungsdatei auch zur Gruppe hinzu
            similarity_groups[group_key].insert(0, (file1, 1.0))
        else:
            # Löschen leerer Gruppen
            del similarity_groups[group_key]
    
    return similarity_groups

def create_toc_entry(file_path: str) -> str:
    """Erstellt einen Eintrag für das Inhaltsverzeichnis aus einem Dateipfad."""
    # Basisdateiname ohne Erweiterung und numerische Präfixe
    basename = os.path.basename(file_path)
    name_without_ext = os.path.splitext(basename)[0]
    
    # Entferne numerische Präfixe für die Anzeige
    clean_name = re.sub(r'^\d+_', '', name_without_ext)
    display_name = clean_name.replace('_', ' ')
    
    # Beschreibungen basierend auf dem Dateinamen
    descriptions = {
        'PROJEKT_UEBERBLICK': 'Überblick über das Gesamtprojekt',
        'ROADMAP': 'Entwicklungsfahrplan und Meilensteine',
        'SYSTEM_ARCHITEKTUR': 'Übersicht über die Gesamtarchitektur',
        'FRONTEND_ARCHITEKTUR': 'Architektur der Frontend-Komponenten',
        'BACKEND_ARCHITEKTUR': 'Architektur der Backend-Komponenten',
        'SETUP': 'Einrichtung der Entwicklungsumgebung',
        'KOMPONENTEN_LEITFADEN': 'Richtlinien zur Komponentenentwicklung',
        'API_INTEGRATION': 'Integration mit Backend-APIs',
        'VUE_SFC_STRATEGIE': 'Strategie zur Migration auf Vue 3 SFCs',
        'VUE_SFC_STATUS': 'Aktueller Status der Vue 3 Migration',
        'MIGRATIONS_ERKENNTNISSE': 'Erkenntnisse aus Migrationsprojekten',
        'MIGRATIONS_AKTIONSPLAN': 'Konkreter Aktionsplan für die Migration',
        'DOKUMENTENKONVERTER': 'Dokumentation des Dokumentenkonverter-Features',
        'ROLLENKONZEPT': 'Benutzerrollen und Berechtigungskonzept',
        'STATE_MANAGEMENT': 'Zustandsverwaltung in der Anwendung',
        'TYPESCRIPT_TYPEN': 'TypeScript-Typdefinitionen und -verwendung',
        'FEHLERBEHANDLUNG': 'Strategien zur Fehlerbehandlung',
        'API_CLIENT': 'Implementierung des API-Clients',
        'DATENPERSISTENZ': 'Mechanismen zur Datenspeicherung und -persistenz'
    }
    
    # Versuch, eine Beschreibung zu finden
    description = descriptions.get(clean_name, '')
    
    # Relativer Pfad für den Link (von /docs aus)
    relative_path = file_path.replace('docs/', '', 1)
    
    if description:
        return f"- [{display_name}]({relative_path}) - {description}"
    else:
        return f"- [{display_name}]({relative_path})"

def generate_toc(target_files: Dict[str, str]) -> str:
    """Generiert ein Inhaltsverzeichnis für die konsolidierten Dokumente."""
    toc = [
        "# nscale DMS Assistent Dokumentation",
        "",
        "Diese Dokumentation enthält alle relevanten Informationen zum nscale DMS Assistenten.",
        "Sie ist in verschiedene Abschnitte unterteilt, die verschiedene Aspekte des Projekts abdecken.",
        "",
        "## Inhaltsverzeichnis",
        ""
    ]
    
    # Kategorisierte Dateien
    categorized_files = defaultdict(list)
    
    # Dateien nach Kategorie gruppieren
    for target_file in target_files.values():
        # Ignoriere Dateien, die nicht im docs-Verzeichnis sind
        if not target_file.startswith('docs/'):
            continue
            
        # Bestimme die Kategorie aus dem Pfad
        path_parts = target_file.replace('docs/', '').split('/')
        
        if len(path_parts) == 1:
            # Dateien direkt im docs-Verzeichnis
            prefix = path_parts[0].split('_')[0]  # z.B. '00' von '00_ROADMAP.md'
            category = prefix
        else:
            # Dateien in Unterverzeichnissen
            category = path_parts[0]  # z.B. '01_ARCHITEKTUR'
        
        categorized_files[category].append(target_file)
    
    # TOC nach Kategorien generieren
    for category in sorted(categorized_files.keys()):
        category_title = CATEGORY_TITLES.get(category, category.replace('_', ' '))
        toc.append(f"### {category_title}")
        toc.append("")
        
        # Dateien innerhalb einer Kategorie sortieren
        for file_path in sorted(categorized_files[category]):
            toc_entry = create_toc_entry(file_path)
            toc.append(toc_entry)
        
        toc.append("")
    
    toc.append("---")
    toc.append("")
    toc.append(f"*Letzte Aktualisierung: {datetime.datetime.now().strftime('%d.%m.%Y')}*")
    
    return '\n'.join(toc)

def create_readme(target_files: Dict[str, str], dry_run: bool = False) -> None:
    """Erstellt eine README.md im docs-Verzeichnis mit Inhaltsverzeichnis."""
    toc_content = generate_toc(target_files)
    readme_path = os.path.join(DOCS_DIR, 'README.md')
    
    if dry_run:
        logger.info(f"[TROCKEN] Würde README.md im docs-Verzeichnis erstellen")
        logger.debug(f"[TROCKEN] README.md Inhalt hätte {len(toc_content)} Zeichen")
        return
    
    try:
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(toc_content)
        logger.info(f"README.md im docs-Verzeichnis erstellt: {readme_path}")
    except Exception as e:
        logger.error(f"Fehler beim Erstellen von README.md: {e}")

def remove_files(files: List[str], dry_run: bool = False) -> None:
    """Entfernt Dateien, die nach der Konsolidierung nicht mehr benötigt werden."""
    for file_path in files:
        abs_path = normalize_path(file_path)
        if not os.path.exists(abs_path):
            logger.debug(f"Zu löschende Datei existiert nicht: {abs_path}")
            continue
        
        if dry_run:
            logger.info(f"[TROCKEN] Würde Datei löschen: {file_path}")
        else:
            try:
                os.remove(abs_path)
                logger.info(f"Datei gelöscht: {file_path}")
            except Exception as e:
                logger.error(f"Fehler beim Löschen von {file_path}: {e}")

def check_git_repo() -> bool:
    """Prüft, ob das aktuelle Verzeichnis ein Git-Repository ist."""
    try:
        subprocess.run(['git', 'rev-parse', '--is-inside-work-tree'], 
                      check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def create_consolidation_log(
    moved_files: List[Tuple[str, str]],
    merged_files: Dict[str, List[str]],
    removed_files: List[str],
    success: bool,
    dry_run: bool
) -> None:
    """Erstellt ein Log aller vorgenommenen Änderungen."""
    log_content = [
        "# Dokumentationskonsolidierung - Änderungsprotokoll",
        "",
        f"Datum: {datetime.datetime.now().strftime('%d.%m.%Y %H:%M:%S')}",
        f"Modus: {'Trockenlauf' if dry_run else 'Produktiv'}",
        f"Status: {'Erfolgreich' if success else 'Mit Fehlern'}",
        "",
        "## Verschobene Dateien",
        ""
    ]
    
    for source, dest in moved_files:
        log_content.append(f"- {source} -> {dest}")
    
    log_content.extend(["", "## Zusammengeführte Dateien", ""])
    
    for dest, sources in merged_files.items():
        log_content.append(f"- Ziel: {dest}")
        for source in sources:
            log_content.append(f"  - Quelle: {source}")
        log_content.append("")
    
    log_content.extend(["", "## Entfernte Dateien", ""])
    
    for file_path in removed_files:
        log_content.append(f"- {file_path}")
    
    log_path = os.path.join(DOCS_DIR, 'KONSOLIDIERUNG_LOG.md')
    
    if dry_run:
        logger.info(f"[TROCKEN] Würde Änderungsprotokoll erstellen: {log_path}")
        return
    
    try:
        with open(log_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(log_content))
        logger.info(f"Änderungsprotokoll erstellt: {log_path}")
    except Exception as e:
        logger.error(f"Fehler beim Erstellen des Änderungsprotokolls: {e}")

def main():
    """Hauptfunktion des Skripts."""
    parser = argparse.ArgumentParser(description='Dokumentationskonsolidierungsskript für nscale DMS Assistent')
    parser.add_argument('--dry-run', action='store_true', help='Nur Ausgabe, keine Änderungen vornehmen')
    parser.add_argument('--verbose', '-v', action='store_true', help='Ausführliche Ausgabe')
    parser.add_argument('--force', '-f', action='store_true', help='Vorhandene Dateien überschreiben')
    parser.add_argument('--skip-merge', action='store_true', help='Zusammenführung von Dokumenten überspringen')
    parser.add_argument('--skip-remove', action='store_true', help='Entfernen von Dokumenten überspringen')
    
    args = parser.parse_args()
    
    # Loglevel anpassen
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    logger.info("Starte Dokumentationskonsolidierung...")
    
    # Prüfen, ob es sich um ein Git-Repository handelt
    if not check_git_repo():
        logger.warning("Das Verzeichnis ist kein Git-Repository. Änderungen werden direkt im Dateisystem vorgenommen.")
    
    # Verzeichnisse erstellen
    if not args.dry_run:
        create_directory(DOCS_DIR)
        create_directory(os.path.join(DOCS_DIR, '01_ARCHITEKTUR'))
        create_directory(os.path.join(DOCS_DIR, '02_ENTWICKLUNG'))
        create_directory(os.path.join(DOCS_DIR, '03_MIGRATION'))
        create_directory(os.path.join(DOCS_DIR, '04_FEATURES'))
        create_directory(os.path.join(DOCS_DIR, '05_REFERENZEN'))
    
    # Doppelte Dateien analysieren
    source_files = list(FILE_MAPPINGS.keys())
    duplicate_groups = analyze_duplicates(source_files)
    
    if duplicate_groups:
        logger.info(f"Gefundene Duplikate oder ähnliche Dokumente:")
        for main_file, similar_files in duplicate_groups.items():
            similar_files_str = ", ".join([f"{file} ({ratio:.2f})" for file, ratio in similar_files])
            logger.info(f"  - {main_file} ähnlich zu: {similar_files_str}")
    
    # Dateien verschieben
    moved_files = []
    for source, dest in FILE_MAPPINGS.items():
        source_path = normalize_path(source)
        if os.path.exists(source_path):
            if move_file_with_git(source, dest, args.dry_run):
                moved_files.append((source, dest))
    
    # Dateien zusammenführen
    merged_files = {}
    if not args.skip_merge:
        for dest, sources in FILES_TO_MERGE.items():
            # Filtern, um nur existierende Quelldateien zu verwenden
            existing_sources = [s for s in sources if os.path.exists(normalize_path(s))]
            if existing_sources:
                if merge_files(existing_sources, dest, args.dry_run):
                    merged_files[dest] = existing_sources
    
    # Nicht mehr benötigte Dateien entfernen
    removed_files = []
    if not args.skip_remove:
        # Dateien entfernen, die explizit in FILES_TO_REMOVE aufgeführt sind
        explicit_remove = [f for f in FILES_TO_REMOVE if os.path.exists(normalize_path(f))]
        remove_files(explicit_remove, args.dry_run)
        removed_files.extend(explicit_remove)
        
        # Dateien entfernen, die zusammengeführt wurden
        for dest, sources in merged_files.items():
            if not args.dry_run:
                for source in sources:
                    if source in FILE_MAPPINGS:
                        source_dest = FILE_MAPPINGS[source]
                        if source_dest != dest and os.path.exists(normalize_path(source_dest)):
                            os.remove(normalize_path(source_dest))
                            removed_files.append(source_dest)
                            logger.info(f"Zusammengeführte Datei gelöscht: {source_dest}")
    
    # Inhaltsverzeichnis erstellen
    target_files = {src: dst for src, dst in FILE_MAPPINGS.items() if os.path.exists(normalize_path(src))}
    create_readme(target_files, args.dry_run)
    
    # Änderungsprotokoll erstellen
    create_consolidation_log(
        moved_files, 
        merged_files, 
        removed_files, 
        True,  # Success-Flag
        args.dry_run
    )
    
    if args.dry_run:
        logger.info("Trockenlauf abgeschlossen. Keine Änderungen wurden vorgenommen.")
    else:
        logger.info("Dokumentationskonsolidierung abgeschlossen.")
        logger.info(f"  - {len(moved_files)} Dateien verschoben")
        logger.info(f"  - {len(merged_files)} Zieldateien aus {sum(len(sources) for sources in merged_files.values())} Quelldateien zusammengeführt")
        logger.info(f"  - {len(removed_files)} Dateien entfernt")
        logger.info(f"Inhaltsverzeichnis erstellt in {os.path.join(DOCS_DIR, 'README.md')}")
        logger.info(f"Änderungsprotokoll erstellt in {os.path.join(DOCS_DIR, 'KONSOLIDIERUNG_LOG.md')}")

if __name__ == "__main__":
    main()