"""
Web-App für die Dokumentenkonvertierungspipeline.
Stellt eine einfache Web-UI zur Verfügung, um Dokumente zu konvertieren.
"""

import os
import sys
import json
import time
import uuid
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Union

# Füge das Hauptverzeichnis zum Pfad hinzu
sys.path.append(str(Path(__file__).parent.parent.parent))

# FastAPI-Importe
from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi import Request, status
from starlette.responses import HTMLResponse
from pydantic import BaseModel

# DocConverter-Importe
from doc_converter.main import DocConverter
from doc_converter.utils.config import ConfigManager
from doc_converter.utils.logger import LogManager

# Konfiguration laden
config = ConfigManager.load_config()
logger = LogManager.setup_logging(config=config)

# DocConverter initialisieren
try:
    converter = DocConverter(config)
except Exception as e:
    logger.error(f"Fehler bei der Initialisierung des DocConverters: {e}", exc_info=True)
    converter = None

# FastAPI-App erstellen
app = FastAPI(
    title="Dokumentenkonverter API",
    description="API zur Konvertierung von Dokumenten in Markdown für den nscale DMS Assistenten",
    version="1.0.0"
)

# CORS-Konfiguration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In der Produktion einschränken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Statische Dateien und Templates
templates_dir = Path(__file__).parent / "templates"
static_dir = Path(__file__).parent / "static"

# Falls Verzeichnisse nicht existieren, erstelle sie
templates_dir.mkdir(parents=True, exist_ok=True)
static_dir.mkdir(parents=True, exist_ok=True)

# Stelle sicher, dass eine einfache index.html existiert, falls nicht bereits vorhanden
index_html_path = templates_dir / "index.html"
if not index_html_path.exists():
    with open(index_html_path, "w", encoding="utf-8") as f:
        f.write("""<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dokumentenkonverter</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <header>
        <h1>Dokumentenkonverter für nscale DMS Assistent</h1>
    </header>
    <main>
        <section class="upload-section">
            <h2>Dokument hochladen</h2>
            <form id="upload-form" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="file">Dokument auswählen:</label>
                    <input type="file" id="file" name="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.htm" required>
                </div>
                <div class="form-group">
                    <label for="post-processing">Nachbearbeitung:</label>
                    <input type="checkbox" id="post-processing" name="post_processing" checked>
                </div>
                <button type="submit">Konvertieren</button>
            </form>
        </section>
        <section class="results-section" id="results" style="display:none;">
            <h2>Konvertierungsergebnis</h2>
            <div id="loading" style="display:none;">
                <p>Konvertierung läuft, bitte warten...</p>
                <div class="loader"></div>
            </div>
            <div id="result-details">
                <div class="result-info">
                    <p><strong>Status:</strong> <span id="status"></span></p>
                    <p><strong>Quelldatei:</strong> <span id="source-file"></span></p>
                    <p><strong>Zieldatei:</strong> <span id="target-file"></span></p>
                </div>
                <div class="result-actions">
                    <button id="download-btn" style="display:none;">Herunterladen</button>
                    <button id="view-btn" style="display:none;">Vorschau</button>
                </div>
            </div>
            <div id="preview" style="display:none;">
                <h3>Vorschau</h3>
                <div id="preview-content"></div>
            </div>
        </section>
        <section class="report-section">
            <h2>Konvertierungsberichte</h2>
            <p>Sehen Sie die letzten Konvertierungsberichte ein.</p>
            <button id="load-reports-btn">Berichte laden</button>
            <div id="reports-list" style="display:none;"></div>
        </section>
    </main>
    <script src="/static/script.js"></script>
</body>
</html>
""")

# Stelle sicher, dass ein einfaches CSS existiert
css_path = static_dir / "style.css"
if not css_path.exists():
    with open(css_path, "w", encoding="utf-8") as f:
        f.write("""
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    background-color: #2c3e50;
    color: white;
    padding: 1rem;
    margin-bottom: 2rem;
    border-radius: 5px;
}

h1, h2, h3 {
    margin-bottom: 1rem;
}

section {
    background-color: #f9f9f9;
    padding: 1.5rem;
    margin-bottom: 2rem;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.form-group {
    margin-bottom: 1rem;
}

label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
}

input[type="file"] {
    padding: 0.5rem;
    width: 100%;
}

button {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    border-radius: 3px;
    font-size: 1rem;
}

button:hover {
    background-color: #2980b9;
}

#download-btn {
    background-color: #27ae60;
}

#download-btn:hover {
    background-color: #2ecc71;
}

#view-btn {
    background-color: #f39c12;
}

#view-btn:hover {
    background-color: #f1c40f;
}

.result-info {
    margin-bottom: 1rem;
}

.result-actions {
    margin-bottom: 1rem;
}

.result-actions button {
    margin-right: 0.5rem;
}

#preview {
    background-color: white;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 5px;
    margin-top: 1rem;
}

#preview-content {
    white-space: pre-wrap;
    font-family: monospace;
    max-height: 400px;
    overflow-y: auto;
    padding: 1rem;
    background-color: #f5f5f5;
    border-radius: 3px;
}

.loader {
    border: 5px solid #f3f3f3;
    border-top: 5px solid #3498db;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 2s linear infinite;
    margin: 1rem auto;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

#reports-list {
    margin-top: 1rem;
}

.report-item {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 3px;
}

.report-item:hover {
    background-color: #f0f0f0;
}

.success-status {
    color: #27ae60;
}

.error-status {
    color: #e74c3c;
}
""")

# Stelle sicher, dass ein einfaches JavaScript existiert
js_path = static_dir / "script.js"
if not js_path.exists():
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("""
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const resultsSection = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    const statusSpan = document.getElementById('status');
    const sourceFileSpan = document.getElementById('source-file');
    const targetFileSpan = document.getElementById('target-file');
    const downloadBtn = document.getElementById('download-btn');
    const viewBtn = document.getElementById('view-btn');
    const previewDiv = document.getElementById('preview');
    const previewContent = document.getElementById('preview-content');
    const loadReportsBtn = document.getElementById('load-reports-btn');
    const reportsList = document.getElementById('reports-list');

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Zeige Loading-Indikator
        resultsSection.style.display = 'block';
        loadingDiv.style.display = 'block';
        statusSpan.textContent = 'Konvertierung wird gestartet...';
        downloadBtn.style.display = 'none';
        viewBtn.style.display = 'none';
        previewDiv.style.display = 'none';
        
        // Daten vorbereiten
        const formData = new FormData(uploadForm);
        
        try {
            // Sende Anfrage an API
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP-Fehler: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Verstecke Loading-Indikator
            loadingDiv.style.display = 'none';
            
            // Zeige Ergebnis
            if (result.success) {
                statusSpan.textContent = 'Erfolgreich';
                statusSpan.className = 'success-status';
            } else {
                statusSpan.textContent = 'Fehler: ' + result.error;
                statusSpan.className = 'error-status';
            }
            
            sourceFileSpan.textContent = result.source_filename || 'Unbekannt';
            targetFileSpan.textContent = result.target_filename || 'Keine Datei generiert';
            
            // Aktiviere Download-Button, wenn Zieldatei vorhanden
            if (result.job_id && result.success) {
                downloadBtn.style.display = 'inline-block';
                downloadBtn.onclick = function() {
                    window.location.href = `/api/download/${result.job_id}`;
                };
                
                viewBtn.style.display = 'inline-block';
                viewBtn.onclick = async function() {
                    try {
                        const previewResponse = await fetch(`/api/preview/${result.job_id}`);
                        if (!previewResponse.ok) {
                            throw new Error(`HTTP-Fehler: ${previewResponse.status}`);
                        }
                        
                        const previewData = await previewResponse.text();
                        previewContent.textContent = previewData;
                        previewDiv.style.display = 'block';
                    } catch (error) {
                        alert('Fehler beim Laden der Vorschau: ' + error.message);
                    }
                };
            }
        } catch (error) {
            console.error('Fehler:', error);
            loadingDiv.style.display = 'none';
            statusSpan.textContent = 'Fehler: ' + error.message;
            statusSpan.className = 'error-status';
        }
    });
    
    loadReportsBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/reports');
            if (!response.ok) {
                throw new Error(`HTTP-Fehler: ${response.status}`);
            }
            
            const reports = await response.json();
            
            reportsList.innerHTML = '';
            if (reports.length === 0) {
                reportsList.innerHTML = '<p>Keine Berichte verfügbar.</p>';
            } else {
                reports.forEach(report => {
                    const reportItem = document.createElement('div');
                    reportItem.className = 'report-item';
                    
                    const statusClass = report.success ? 'success-status' : 'error-status';
                    const statusText = report.success ? 'Erfolgreich' : 'Fehler';
                    
                    reportItem.innerHTML = `
                        <p><strong>Datum:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
                        <p><strong>Datei:</strong> ${report.source_filename}</p>
                        <p><strong>Status:</strong> <span class="${statusClass}">${statusText}</span></p>
                        <button class="view-report-btn" data-id="${report.job_id}">Details</button>
                    `;
                    
                    reportsList.appendChild(reportItem);
                });
                
                // Event-Listener für Details-Buttons
                document.querySelectorAll('.view-report-btn').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        const jobId = this.getAttribute('data-id');
                        try {
                            const reportResponse = await fetch(`/api/report/${jobId}`);
                            if (!reportResponse.ok) {
                                throw new Error(`HTTP-Fehler: ${reportResponse.status}`);
                            }
                            
                            const reportDetails = await reportResponse.json();
                            
                            alert(`Bericht für Job ${jobId}:\\n` + 
                                  `Quelle: ${reportDetails.source_filename}\\n` +
                                  `Ziel: ${reportDetails.target_filename}\\n` +
                                  `Status: ${reportDetails.success ? 'Erfolgreich' : 'Fehler'}\\n` +
                                  `Zeit: ${reportDetails.processing_time} Sekunden`);
                        } catch (error) {
                            alert('Fehler beim Laden des Berichts: ' + error.message);
                        }
                    });
                });
            }
            
            reportsList.style.display = 'block';
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Laden der Berichte: ' + error.message);
        }
    });
});
""")

# Mounten der statischen Dateien
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Templates
templates = Jinja2Templates(directory=templates_dir)

# Auth
security = HTTPBasic()

# Datenmodelle
class ConversionJob(BaseModel):
    job_id: str
    source_filename: str
    target_filename: Optional[str] = None
    success: bool
    error: Optional[str] = None
    processing_time: float
    timestamp: float
    changes: List[str] = []

# Speicher für Konvertierungsjobs
conversion_jobs: Dict[str, ConversionJob] = {}

# Hilfsfunktionen
def get_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """Überprüft die Anmeldeinformationen"""
    correct_username = os.environ.get("DOC_CONVERTER_USERNAME", "admin")
    correct_password = os.environ.get("DOC_CONVERTER_PASSWORD", "password")
    
    if credentials.username != correct_username or credentials.password != correct_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültige Anmeldeinformationen",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    return credentials.username

# Routen
@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    """Gibt die Index-Seite zurück"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/convert")
async def convert_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    post_processing: bool = Form(True)
):
    """
    Konvertiert ein hochgeladenes Dokument in Markdown.
    
    Args:
        file: Hochgeladene Datei
        post_processing: Ob Nachbearbeitung durchgeführt werden soll
    
    Returns:
        Informationen über den Konvertierungsjob
    """
    # Prüfe, ob DocConverter initialisiert wurde
    if converter is None:
        raise HTTPException(
            status_code=500,
            detail="Dokumentenkonverter konnte nicht initialisiert werden"
        )
    
    # Erstelle Job-ID
    job_id = str(uuid.uuid4())
    timestamp = time.time()
    
    # Erstelle temporäres Verzeichnis für die Konvertierung
    temp_dir = Path(tempfile.mkdtemp(prefix=f"doc_converter_{job_id}_"))
    source_dir = temp_dir / "source"
    target_dir = temp_dir / "target"
    source_dir.mkdir()
    target_dir.mkdir()
    
    # Speichere hochgeladene Datei
    source_filename = file.filename
    source_path = source_dir / source_filename
    
    with open(source_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Erstelle initialen Job-Status
    job = ConversionJob(
        job_id=job_id,
        source_filename=source_filename,
        success=False,
        error="Konvertierung noch nicht abgeschlossen",
        processing_time=0,
        timestamp=timestamp,
        changes=[]
    )
    conversion_jobs[job_id] = job
    
    # Starte Konvertierung als Hintergrundaufgabe
    background_tasks.add_task(
        process_conversion,
        job_id,
        source_path,
        target_dir,
        post_processing
    )
    
    return {"job_id": job_id, "source_filename": source_filename, "success": True}

async def process_conversion(job_id: str, source_path: Path, target_dir: Path, post_processing: bool):
    """
    Führt die Konvertierung im Hintergrund durch.
    
    Args:
        job_id: Job-ID
        source_path: Pfad zur Quelldatei
        target_dir: Zielverzeichnis
        post_processing: Ob Nachbearbeitung durchgeführt werden soll
    """
    start_time = time.time()
    job = conversion_jobs[job_id]
    
    try:
        # Setze post_processing-Option
        original_post_processing = converter.post_processing
        converter.post_processing = post_processing
        
        # Konvertiere Dokument
        result = converter.convert_document(source_path, target_dir)
        
        # Stelle ursprüngliche Einstellung wieder her
        converter.post_processing = original_post_processing
        
        # Aktualisiere Job-Status
        processing_time = time.time() - start_time
        
        if result['success']:
            target_path = Path(result['target'])
            job.target_filename = target_path.name
            job.success = True
            job.error = None
            job.processing_time = processing_time
            job.changes = result.get('changes', [])
        else:
            job.success = False
            job.error = result.get('error', "Unbekannter Fehler")
            job.processing_time = processing_time
    
    except Exception as e:
        # Bei Fehler, aktualisiere Job-Status
        processing_time = time.time() - start_time
        job.success = False
        job.error = str(e)
        job.processing_time = processing_time
        logger.error(f"Fehler bei der Konvertierung von {source_path}: {e}", exc_info=True)

@app.get("/api/status/{job_id}")
async def get_job_status(job_id: str):
    """
    Gibt den Status eines Konvertierungsjobs zurück.
    
    Args:
        job_id: Job-ID
    
    Returns:
        Status des Jobs
    """
    if job_id not in conversion_jobs:
        raise HTTPException(
            status_code=404,
            detail="Konvertierungsjob nicht gefunden"
        )
    
    job = conversion_jobs[job_id]
    
    return {
        "job_id": job.job_id,
        "source_filename": job.source_filename,
        "target_filename": job.target_filename,
        "success": job.success,
        "error": job.error,
        "processing_time": job.processing_time,
        "timestamp": job.timestamp,
        "changes": job.changes
    }

@app.get("/api/download/{job_id}")
async def download_converted_file(job_id: str):
    """
    Ermöglicht den Download einer konvertierten Datei.
    
    Args:
        job_id: Job-ID
    
    Returns:
        Konvertierte Datei als Download
    """
    if job_id not in conversion_jobs:
        raise HTTPException(
            status_code=404,
            detail="Konvertierungsjob nicht gefunden"
        )
    
    job = conversion_jobs[job_id]
    
    if not job.success or not job.target_filename:
        raise HTTPException(
            status_code=404,
            detail="Keine konvertierte Datei verfügbar"
        )
    
    # Suche nach der Zieldatei
    temp_dir = Path(tempfile.gettempdir())
    job_dirs = list(temp_dir.glob(f"doc_converter_{job_id}_*"))
    
    if not job_dirs:
        raise HTTPException(
            status_code=404,
            detail="Temporäres Verzeichnis nicht gefunden"
        )
    
    job_dir = job_dirs[0]
    target_dir = job_dir / "target"
    target_file = target_dir / job.target_filename
    
    if not target_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Zieldatei nicht gefunden"
        )
    
    return FileResponse(
        path=target_file,
        filename=job.target_filename,
        media_type="text/markdown"
    )

@app.get("/api/preview/{job_id}")
async def preview_converted_file(job_id: str):
    """
    Gibt eine Vorschau einer konvertierten Datei zurück.
    
    Args:
        job_id: Job-ID
    
    Returns:
        Inhalt der konvertierten Datei
    """
    if job_id not in conversion_jobs:
        raise HTTPException(
            status_code=404,
            detail="Konvertierungsjob nicht gefunden"
        )
    
    job = conversion_jobs[job_id]
    
    if not job.success or not job.target_filename:
        raise HTTPException(
            status_code=404,
            detail="Keine konvertierte Datei verfügbar"
        )
    
    # Suche nach der Zieldatei
    temp_dir = Path(tempfile.gettempdir())
    job_dirs = list(temp_dir.glob(f"doc_converter_{job_id}_*"))
    
    if not job_dirs:
        raise HTTPException(
            status_code=404,
            detail="Temporäres Verzeichnis nicht gefunden"
        )
    
    job_dir = job_dirs[0]
    target_dir = job_dir / "target"
    target_file = target_dir / job.target_filename
    
    if not target_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Zieldatei nicht gefunden"
        )
    
    # Lese Inhalt der Datei
    with open(target_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    return content

@app.get("/api/reports")
async def get_reports():
    """
    Gibt eine Liste aller Konvertierungsjobs zurück.
    
    Returns:
        Liste der Jobs
    """
    # Sortiere Jobs nach Timestamp (neueste zuerst)
    sorted_jobs = sorted(
        conversion_jobs.values(),
        key=lambda x: x.timestamp,
        reverse=True
    )
    
    return [
        {
            "job_id": job.job_id,
            "source_filename": job.source_filename,
            "target_filename": job.target_filename,
            "success": job.success,
            "timestamp": job.timestamp
        }
        for job in sorted_jobs
    ]

@app.get("/api/report/{job_id}")
async def get_report(job_id: str):
    """
    Gibt einen detaillierten Bericht über einen Konvertierungsjob zurück.
    
    Args:
        job_id: Job-ID
    
    Returns:
        Detaillierter Bericht
    """
    if job_id not in conversion_jobs:
        raise HTTPException(
            status_code=404,
            detail="Konvertierungsjob nicht gefunden"
        )
    
    job = conversion_jobs[job_id]
    
    return {
        "job_id": job.job_id,
        "source_filename": job.source_filename,
        "target_filename": job.target_filename,
        "success": job.success,
        "error": job.error,
        "processing_time": job.processing_time,
        "timestamp": job.timestamp,
        "changes": job.changes
    }

@app.delete("/api/report/{job_id}")
async def delete_report(
    job_id: str,
    username: str = Depends(get_credentials)
):
    """
    Löscht einen Konvertierungsjob.
    
    Args:
        job_id: Job-ID
        username: Authentifizierter Benutzername
    
    Returns:
        Bestätigung
    """
    if job_id not in conversion_jobs:
        raise HTTPException(
            status_code=404,
            detail="Konvertierungsjob nicht gefunden"
        )
    
    # Entferne Job aus dem Speicher
    del conversion_jobs[job_id]
    
    # Lösche temporäres Verzeichnis
    temp_dir = Path(tempfile.gettempdir())
    job_dirs = list(temp_dir.glob(f"doc_converter_{job_id}_*"))
    
    for job_dir in job_dirs:
        try:
            import shutil
            shutil.rmtree(job_dir)
        except Exception as e:
            logger.warning(f"Fehler beim Löschen des temporären Verzeichnisses {job_dir}: {e}")
    
    return {"success": True, "message": "Konvertierungsjob erfolgreich gelöscht"}

@app.get("/api/health")
async def health_check():
    """
    Überprüft den Gesundheitszustand der Anwendung.
    
    Returns:
        Gesundheitsstatus
    """
    return {
        "status": "OK" if converter is not None else "ERROR",
        "version": "1.0.0",
        "timestamp": time.time(),
        "converters_available": {
            "pdf": hasattr(converter, "pdf_converter") if converter else False,
            "docx": hasattr(converter, "docx_converter") if converter else False,
            "xlsx": hasattr(converter, "excel_converter") if converter else False,
            "pptx": hasattr(converter, "pptx_converter") if converter else False,
            "html": hasattr(converter, "html_converter") if converter else False
        }
    }

@app.post("/api/admin/clear-temp")
async def clear_temp_files(
    username: str = Depends(get_credentials)
):
    """
    Löscht alle temporären Dateien.
    
    Args:
        username: Authentifizierter Benutzername
    
    Returns:
        Bestätigung
    """
    temp_dir = Path(tempfile.gettempdir())
    job_dirs = list(temp_dir.glob("doc_converter_*"))
    
    deleted_dirs = 0
    for job_dir in job_dirs:
        try:
            import shutil
            shutil.rmtree(job_dir)
            deleted_dirs += 1
        except Exception as e:
            logger.warning(f"Fehler beim Löschen des temporären Verzeichnisses {job_dir}: {e}")
    
    return {
        "success": True,
        "message": f"{deleted_dirs} temporäre Verzeichnisse gelöscht"
    }

@app.post("/api/admin/clear-jobs")
async def clear_jobs(
    username: str = Depends(get_credentials)
):
    """
    Löscht alle Konvertierungsjobs.
    
    Args:
        username: Authentifizierter Benutzername
    
    Returns:
        Bestätigung
    """
    job_count = len(conversion_jobs)
    conversion_jobs.clear()
    
    return {
        "success": True,
        "message": f"{job_count} Konvertierungsjobs gelöscht"
    }

# Wenn direkt ausgeführt, starte Uvicorn-Server
if __name__ == "__main__":
    import uvicorn
    
    # Konfiguration laden
    host = os.environ.get("DOC_CONVERTER_HOST", "127.0.0.1")
    port = int(os.environ.get("DOC_CONVERTER_PORT", 8080))
    
    print(f"Starte Dokumentenkonverter-Server auf {host}:{port}")
    uvicorn.run("app:app", host=host, port=port, reload=True)