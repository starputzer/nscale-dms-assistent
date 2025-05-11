"""
Hilfsfunktionen für Dateioperationen in der Dokumentenkonvertierungspipeline.
"""

import os
import shutil
import hashlib
import re
from pathlib import Path
from typing import List, Set, Dict, Any, Optional, Tuple


def create_directory(directory_path: str) -> bool:
    """
    Erstellt ein Verzeichnis, falls es nicht existiert.
    
    Args:
        directory_path: Pfad zum Verzeichnis
        
    Returns:
        True, wenn das Verzeichnis existiert oder erfolgreich erstellt wurde
    """
    try:
        path = Path(directory_path)
        path.mkdir(parents=True, exist_ok=True)
        return True
    except Exception:
        return False


def is_file_supported(file_path: Path, supported_extensions: Optional[List[str]] = None) -> bool:
    """
    Prüft, ob eine Datei von der Pipeline unterstützt wird.
    
    Args:
        file_path: Pfad zur Datei
        supported_extensions: Liste der unterstützten Dateiendungen
        
    Returns:
        True, wenn die Datei unterstützt wird
    """
    if supported_extensions is None:
        # Standardliste der unterstützten Erweiterungen
        supported_extensions = [
            '.pdf', '.docx', '.doc', '.xlsx', '.xls', 
            '.pptx', '.ppt', '.md', '.html', '.htm', '.txt'
        ]
    
    # Prüfe, ob die Datei existiert und eine Datei ist
    if not file_path.exists() or not file_path.is_file():
        return False
    
    # Prüfe die Dateierweiterung
    return file_path.suffix.lower() in supported_extensions


def get_files_in_directory(directory_path: str, recursive: bool = True, 
                          supported_extensions: Optional[List[str]] = None) -> List[Path]:
    """
    Gibt alle unterstützten Dateien in einem Verzeichnis zurück.
    
    Args:
        directory_path: Pfad zum Verzeichnis
        recursive: Ob Unterverzeichnisse durchsucht werden sollen
        supported_extensions: Liste der unterstützten Dateiendungen
        
    Returns:
        Liste der Dateipfade
    """
    path = Path(directory_path)
    
    if not path.exists() or not path.is_dir():
        return []
    
    files = []
    
    if recursive:
        # Rekursive Suche
        for item in path.glob('**/*'):
            if item.is_file() and is_file_supported(item, supported_extensions):
                files.append(item)
    else:
        # Nur direktes Verzeichnis
        for item in path.iterdir():
            if item.is_file() and is_file_supported(item, supported_extensions):
                files.append(item)
    
    return files


def calculate_file_hash(file_path: Path) -> str:
    """
    Berechnet den SHA-256-Hash einer Datei.
    
    Args:
        file_path: Pfad zur Datei
        
    Returns:
        Hash der Datei als Hexadezimalstring
    """
    if not file_path.exists() or not file_path.is_file():
        return ""
    
    hash_obj = hashlib.sha256()
    
    try:
        with open(file_path, 'rb') as f:
            # Lese die Datei in Blöcken, um Speicherprobleme bei großen Dateien zu vermeiden
            for block in iter(lambda: f.read(4096), b''):
                hash_obj.update(block)
                
        return hash_obj.hexdigest()
    except Exception:
        return ""


def sanitize_filename(filename: str) -> str:
    """
    Bereinigt einen Dateinamen, um ungültige Zeichen zu entfernen.
    
    Args:
        filename: Ursprünglicher Dateiname
        
    Returns:
        Bereinigter Dateiname
    """
    # Entferne ungültige Zeichen
    sanitized = re.sub(r'[\\/*?:"<>|]', '', filename)
    
    # Ersetze Leerzeichen durch Unterstriche
    sanitized = re.sub(r'\s+', '_', sanitized)
    
    # Entferne Punkte am Anfang (versteckte Dateien in Unix)
    sanitized = sanitized.lstrip('.')
    
    # Stellt sicher, dass der Dateiname nicht leer ist
    if not sanitized:
        sanitized = "unnamed"
    
    return sanitized


def get_unique_filename(directory: Path, base_name: str, extension: str) -> Path:
    """
    Generiert einen eindeutigen Dateinamen im angegebenen Verzeichnis.
    
    Args:
        directory: Verzeichnis
        base_name: Basis-Dateiname (ohne Erweiterung)
        extension: Dateierweiterung (mit Punkt)
        
    Returns:
        Eindeutiger Dateipfad
    """
    # Stelle sicher, dass die Erweiterung mit einem Punkt beginnt
    if not extension.startswith('.'):
        extension = f".{extension}"
    
    # Sanitize Basis-Namen
    base_name = sanitize_filename(base_name)
    
    # Erstelle den ersten Kandidaten
    candidate_path = directory / f"{base_name}{extension}"
    
    # Wenn die Datei bereits existiert, füge eine Zahl hinzu
    counter = 1
    while candidate_path.exists():
        candidate_path = directory / f"{base_name}_{counter}{extension}"
        counter += 1
    
    return candidate_path


def copy_with_structure(source_file: Path, source_base: Path, target_base: Path) -> Optional[Path]:
    """
    Kopiert eine Datei mit Erhaltung der Verzeichnisstruktur.
    
    Args:
        source_file: Pfad zur Quelldatei
        source_base: Basis-Pfad des Quellverzeichnisses
        target_base: Basis-Pfad des Zielverzeichnisses
        
    Returns:
        Pfad zur kopierten Datei oder None bei Fehler
    """
    try:
        # Berechne relativen Pfad
        rel_path = source_file.relative_to(source_base)
        
        # Erstelle Zielverzeichnis
        target_dir = target_base / rel_path.parent
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Erstelle Zielpfad
        target_file = target_dir / source_file.name
        
        # Kopiere Datei
        shutil.copy2(source_file, target_file)
        
        return target_file
    except Exception:
        return None


def list_duplicate_files(directory: Path, recursive: bool = True) -> Dict[str, List[Path]]:
    """
    Findet Duplikate basierend auf dem Dateiinhalt.
    
    Args:
        directory: Zu durchsuchendes Verzeichnis
        recursive: Ob Unterverzeichnisse durchsucht werden sollen
        
    Returns:
        Dictionary mit Hashes als Schlüssel und Listen von Dateipfaden als Werte
    """
    file_hashes = {}
    
    # Sammle alle Dateien
    files = get_files_in_directory(str(directory), recursive)
    
    # Berechne Hashes und gruppiere
    for file_path in files:
        file_hash = calculate_file_hash(file_path)
        
        if file_hash:
            if file_hash not in file_hashes:
                file_hashes[file_hash] = []
            
            file_hashes[file_hash].append(file_path)
    
    # Filtere auf Duplikate
    duplicates = {h: paths for h, paths in file_hashes.items() if len(paths) > 1}
    
    return duplicates


def clear_directory(directory: Path, exclude_patterns: Optional[List[str]] = None) -> Tuple[int, int]:
    """
    Leert ein Verzeichnis, optional mit Ausnahmen.
    
    Args:
        directory: Zu leerende Verzeichnis
        exclude_patterns: Liste von Glob-Mustern für auszuschließende Dateien
        
    Returns:
        Tuple aus (Anzahl gelöschter Dateien, Anzahl gelöschter Verzeichnisse)
    """
    if not directory.exists() or not directory.is_dir():
        return 0, 0
    
    deleted_files = 0
    deleted_dirs = 0
    
    # Kompiliere Ausschlussmuster, falls vorhanden
    exclude_regexes = []
    if exclude_patterns:
        for pattern in exclude_patterns:
            # Konvertiere Glob-Muster in Regex
            regex_pattern = pattern.replace('.', '\\.').replace('*', '.*').replace('?', '.')
            exclude_regexes.append(re.compile(regex_pattern))
    
    # Sammle alle Elemente mit Ausnahme der ausgeschlossenen
    items_to_delete = []
    for item in directory.glob('**/*'):
        # Überprüfe auf Ausnahmen
        excluded = False
        relative_path = str(item.relative_to(directory))
        
        for regex in exclude_regexes:
            if regex.match(relative_path):
                excluded = True
                break
        
        if not excluded:
            items_to_delete.append(item)
    
    # Sortiere nach Tiefe (tiefste zuerst), um Verzeichnisse korrekt zu löschen
    items_to_delete.sort(key=lambda x: len(str(x).split(os.sep)), reverse=True)
    
    # Lösche Elemente
    for item in items_to_delete:
        try:
            if item.is_file():
                item.unlink()
                deleted_files += 1
            elif item.is_dir():
                # Überprüfe, ob das Verzeichnis leer ist
                if not any(item.iterdir()):
                    item.rmdir()
                    deleted_dirs += 1
        except Exception:
            pass
    
    return deleted_files, deleted_dirs


if __name__ == "__main__":
    # Test-Code
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "list":
            # Liste alle unterstützten Dateien in einem Verzeichnis auf
            if len(sys.argv) > 2:
                directory = sys.argv[2]
                files = get_files_in_directory(directory)
                print(f"Gefunden: {len(files)} unterstützte Dateien")
                for f in files:
                    print(f"  - {f}")
            else:
                print("Verwendung: python file_utils.py list <verzeichnis>")