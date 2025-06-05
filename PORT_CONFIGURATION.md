# Port-Konfiguration

## ✅ Aktuelle Einstellungen:

### Backend (FastAPI):
- **Port**: 8000
- **Datei**: `api/server.py`
- **Zeile 170**: `port = int(os.getenv("PORT", "8000"))`

### Frontend (Vite):
- **Port**: 3000
- **Datei**: `vite.config.js`
- **Zeile 66**: `port: 3000`
- **Proxy**: Leitet `/api` Requests an `http://localhost:8000` weiter

### Umgebungsvariablen:
- **`.env.development`**:
  - `VITE_API_URL=http://localhost:8000`
  - `VITE_PORT=3000`

### CORS (im Backend):
- Erlaubte Origins: `["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]`

## 🚀 Server manuell starten:

### Backend starten:
```bash
cd /opt/nscale-assist/app
python3 api/server.py
```

### Frontend starten (in neuem Terminal):
```bash
cd /opt/nscale-assist/app
npm run dev
```

## 🔍 Überprüfung:

- Backend läuft auf: http://localhost:8000
- Frontend läuft auf: http://localhost:3000
- API-Dokumentation: http://localhost:8000/api/docs

Die Konfiguration ist korrekt eingestellt für die gewünschten Ports!