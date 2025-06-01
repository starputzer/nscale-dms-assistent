# Server Restart Fixes

## Behobene Probleme

### 1. NPM Script Error
**Problem**: `npm error Missing script: "serve"`
**Lösung**: In `restart-all.sh` von `npm run serve` auf `npm run dev` geändert

### 2. LogManager AttributeError
**Problem**: `AttributeError: 'LogManager' object has no attribute 'get_logger'`
**Lösung**: In `api/documentation_api.py` von `LogManager().get_logger()` auf `LogManager.setup_logging()` geändert

### 3. Frontend Port
**Problem**: Falsche Port-Anzeige (3000 statt 5173)
**Lösung**: Port-Anzeige in `restart-all.sh` korrigiert

## Aktuelle Server-Status
- ✅ Backend läuft auf http://localhost:8000
- ✅ Frontend läuft auf http://localhost:5173
- ⚠️ Kleiner Fehler in `fixed_stream_endpoint.py` (nicht kritisch)

## Verwendung
```bash
./restart-all.sh
```

Die Server starten jetzt korrekt und die Anwendung ist unter http://localhost:5173 erreichbar.