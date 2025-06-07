"""
Telemetrie-Handler für die nscale DMS Assistent API

Dieser Handler verarbeitet Telemetriedaten, die vom Frontend gesendet werden,
und speichert sie für spätere Analyse.
"""

import os
import json
import logging
import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Union

# Konfiguration für die Telemetrie
TELEMETRY_CONFIG = {
    # Ob Telemetrie aktiviert ist
    "enabled": True,
    
    # Ob die Daten lokal gespeichert werden sollen
    "store_locally": True,
    
    # Ob die Daten in einer Datenbank gespeichert werden sollen (nicht implementiert)
    "store_in_db": False,
    
    # Dateibasierter Speicher (lokaler Modus)
    "file_storage": {
        # Verzeichnis für Telemetriedaten
        "directory": "logs/telemetry",
        
        # Maximale Anzahl von Dateien
        "max_files": 100,
        
        # Maximale Größe pro Datei in Bytes (10 MB)
        "max_file_size": 10 * 1024 * 1024
    }
}

# Logger konfigurieren
logger = logging.getLogger("telemetry")
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Stellen Sie sicher, dass das Telemetrie-Verzeichnis existiert
if TELEMETRY_CONFIG["store_locally"] and TELEMETRY_CONFIG["file_storage"]["directory"]:
    telemetry_dir = Path(TELEMETRY_CONFIG["file_storage"]["directory"])
    telemetry_dir.mkdir(parents=True, exist_ok=True)
    
    # Datei-Handler hinzufügen
    file_handler = logging.FileHandler(
        telemetry_dir / "telemetry.log", 
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

# Konsolen-Handler hinzufügen
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)


def handle_telemetry(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Verarbeitet eingehende Telemetriedaten
    
    :param request_data: Die eingehenden Telemetriedaten
    :return: Antwort mit Status
    """
    if not TELEMETRY_CONFIG["enabled"]:
        return {"status": "disabled", "message": "Telemetrie ist deaktiviert"}
    
    try:
        # Einzelnes Ereignis oder Ereignisliste verarbeiten
        events = request_data.get("events", [])
        if not events and "eventType" in request_data:
            # Einzelnes Ereignis
            events = [request_data]
        
        # Ereignisse validieren
        valid_events = []
        for event in events:
            if validate_event(event):
                valid_events.append(event)
        
        # Ereignisse speichern
        if valid_events:
            if TELEMETRY_CONFIG["store_locally"]:
                store_events_locally(valid_events)
            
            logger.info(f"Telemetrie: {len(valid_events)} Ereignisse verarbeitet")
            return {
                "status": "success", 
                "message": f"{len(valid_events)} Ereignisse verarbeitet",
                "processed": len(valid_events),
                "timestamp": datetime.datetime.now().isoformat()
            }
        else:
            return {"status": "no_valid_events", "message": "Keine gültigen Ereignisse gefunden"}
    
    except Exception as e:
        logger.error(f"Fehler bei der Verarbeitung von Telemetriedaten: {e}")
        return {"status": "error", "message": str(e)}


def validate_event(event: Dict[str, Any]) -> bool:
    """
    Validiert ein Telemetrie-Ereignis
    
    :param event: Das zu validierende Ereignis
    :return: True, wenn das Ereignis gültig ist
    """
    # Mindestvoraussetzungen
    required_fields = ["eventType"]
    
    for field in required_fields:
        if field not in event:
            logger.warning(f"Ungültiges Ereignis: Feld '{field}' fehlt")
            return False
    
    # A/B-Test-Ereignisse zusätzlich validieren
    if event["eventType"].startswith("ab_test_"):
        if "testId" not in event:
            logger.warning("Ungültiges A/B-Test-Ereignis: 'testId' fehlt")
            return False
    
    return True


def store_events_locally(events: List[Dict[str, Any]]) -> None:
    """
    Speichert Ereignisse lokal in einer Datei
    
    :param events: Die zu speichernden Ereignisse
    """
    if not TELEMETRY_CONFIG["store_locally"]:
        return
    
    try:
        # Aktuelle Datei für Telemetriedaten ermitteln
        config = TELEMETRY_CONFIG["file_storage"]
        telemetry_dir = Path(config["directory"])
        
        # Aktuelles Datum für den Dateinamen
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        file_path = telemetry_dir / f"telemetry_{today}.jsonl"
        
        # Prüfen, ob die Datei zu groß ist
        if file_path.exists() and file_path.stat().st_size > config["max_file_size"]:
            # Neue Datei mit Zeitstempel erstellen
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            file_path = telemetry_dir / f"telemetry_{today}_{timestamp}.jsonl"
        
        # Ereignisse im JSONL-Format (eine JSON-Zeile pro Ereignis) anhängen
        with open(file_path, "a", encoding="utf-8") as f:
            for event in events:
                f.write(json.dumps(event, ensure_ascii=False) + "\n")
        
        # Alte Dateien bereinigen, wenn das Limit erreicht ist
        cleanup_old_telemetry_files(config["directory"], config["max_files"])
    
    except Exception as e:
        logger.error(f"Fehler beim lokalen Speichern von Telemetriedaten: {e}")


def cleanup_old_telemetry_files(directory: str, max_files: int) -> None:
    """
    Bereinigt alte Telemetriedateien, wenn das Limit erreicht ist
    
    :param directory: Das Verzeichnis mit Telemetriedateien
    :param max_files: Maximale Anzahl von Dateien
    """
    try:
        telemetry_dir = Path(directory)
        if not telemetry_dir.exists():
            return
        
        # Alle Telemetriedateien abrufen
        telemetry_files = sorted(
            [f for f in telemetry_dir.glob("telemetry_*.jsonl")],
            key=lambda f: f.stat().st_mtime
        )
        
        # Alte Dateien löschen, wenn das Limit erreicht ist
        if len(telemetry_files) > max_files:
            files_to_delete = telemetry_files[:-max_files]
            for file_path in files_to_delete:
                file_path.unlink()
                logger.info(f"Alte Telemetriedatei gelöscht: {file_path}")
    
    except Exception as e:
        logger.error(f"Fehler beim Bereinigen alter Telemetriedateien: {e}")


# API-Handler
def handle_telemetry_request(request):
    """
    Handler für Telemetrie-API-Anfragen
    
    :param request: Die Flask-Request
    :return: JSON-Antwort
    """
    try:
        data = request.json
        if not data:
            return {
                "status": "error", 
                "message": "Keine Daten empfangen"
            }, 400
        
        result = handle_telemetry(data)
        return result, 200
    
    except Exception as e:
        logger.error(f"Fehler bei der Verarbeitung der Telemetrie-Anfrage: {e}")
        return {
            "status": "error", 
            "message": f"Interner Serverfehler: {str(e)}"
        }, 500