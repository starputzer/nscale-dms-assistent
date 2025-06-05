# Entwicklungsumgebung Setup

## Aktuelle Konfiguration

- **OS**: Red Hat Enterprise Linux 9.5
- **Datenbank**: SQLite (bereits konfiguriert)
- **Backend**: Python FastAPI (Port 8001)
- **Frontend**: Vue 3 mit Vite (Port 3000)

## Schnellstart für Entwicklung

### 1. Backend starten

```bash
# Python-Umgebung aktivieren
source venv/bin/activate

# Backend starten
cd app
python api/server.py
```

### 2. Frontend starten (Entwicklungsmodus)

```bash
# In neuem Terminal
cd app
npm run dev
```

### 3. Services prüfen

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

## Bekannte Probleme

### TypeScript-Fehler
- Aktuell 505+ TypeScript-Fehler durch automatische Fixes
- Workaround: `npm run dev` ignoriert TypeScript-Fehler
- Für Production Build: `./scripts/build-without-typecheck.sh`

### Nächste Schritte

1. **TypeScript-Fehler manuell beheben**
   - Fokus auf kritische Komponenten
   - Schrittweise Korrektur

2. **Testing**
   - Admin-Interface testen
   - RAG-System validieren
   - Performance messen

3. **Deployment-Vorbereitung** (später)
   - Podman-Setup für RHEL
   - Production-Konfiguration
   - Monitoring einrichten

## Entwicklungs-Tipps

- Nutze `npm run dev` für schnelle Iteration
- SQLite reicht für Entwicklung völlig aus
- Keine Docker/PostgreSQL-Installation nötig für lokale Entwicklung