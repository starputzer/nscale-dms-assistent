# API Routes Best Practice Implementation

## Problem
Die API-Pfade waren inkonsistent zwischen Frontend und Backend definiert:
- Frontend nutzte `/api/v1` als Basis
- Pfade waren an mehreren Stellen hardcoded
- Änderungen mussten an vielen Stellen gemacht werden
- Potenzial für Tippfehler und Inkonsistenzen

## Lösung: Zentralisierte Route-Konfiguration

### 1. Shared Route Definitions
Erstellt eine zentrale Quelle der Wahrheit für alle API-Routen:

**TypeScript (Frontend):** `/shared/api-routes.ts`
```typescript
export const API_VERSION = 'v1';
export const API_BASE = '/api';
export const API_BASE_VERSIONED = `${API_BASE}/${API_VERSION}`;

export const AUTH_ROUTES = {
  LOGIN: '/login',
  LOGOUT: '/logout',
  // ...
} as const;
```

**Python (Backend):** `/api/routes_config.py`
```python
API_VERSION = 'v1'
API_BASE = '/api'
API_BASE_VERSIONED = f'{API_BASE}/{API_VERSION}'

class AuthRoutes:
    LOGIN = '/login'
    LOGOUT = '/logout'
    # ...
```

### 2. Vorteile

✅ **Single Source of Truth**: Routen sind nur an einer Stelle definiert
✅ **Type Safety**: TypeScript bietet Autovervollständigung und Typprüfung
✅ **Konsistenz**: Frontend und Backend nutzen identische Pfade
✅ **Wartbarkeit**: Änderungen müssen nur an einer Stelle gemacht werden
✅ **Versionierung**: API-Version kann zentral geändert werden

### 3. Verwendung

#### Frontend
```typescript
import { API_ROUTES, buildApiUrl } from '@/shared/api-routes';

// Statt: '/api/v1/login'
const loginUrl = buildApiUrl(API_ROUTES.AUTH.LOGIN);

// Für dynamische Routen
const userUrl = buildApiUrl(API_ROUTES.ADMIN.USERS.GET('123'));
```

#### Backend
```python
from api.routes_config import AUTH_ROUTES, build_api_url

# Statt: @app.post("/api/v1/login")
@app.post(build_api_url(AUTH_ROUTES.LOGIN))
async def login(credentials: LoginRequest):
    # ...
```

### 4. Proxy-Konfiguration (Vite)

Vereinfachte Proxy-Regel in `vite.config.js`:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    secure: false,
    ws: true
  }
}
```

Eine einzige Regel leitet ALLE `/api/*` Anfragen an das Backend weiter.

### 5. Migration

1. **Backup erstellen**:
   ```bash
   ./migrate-to-shared-routes.sh
   ```

2. **Python Backend aktualisieren**:
   ```bash
   cd api
   mv server_updated.py server.py
   ```

3. **Server neu starten**:
   ```bash
   pkill -f 'python.*server.py'
   python server.py > server.log 2>&1 &
   ```

4. **Frontend dev server neu starten**:
   ```bash
   npm run dev
   ```

### 6. Debugging

Bei Routing-Problemen:
```javascript
// Browser Console
console.log('API Base:', import.meta.env.VITE_API_BASE_URL);

// Check actual request URL
fetch('/api/v1/admin/users').then(r => console.log('Status:', r.status));
```

### 7. Erweiterung

Neue Route hinzufügen:
1. In `/shared/api-routes.ts` definieren
2. In `/api/routes_config.py` spiegeln
3. In Frontend/Backend verwenden

### 8. Best Practices

1. **Keine Hardcoded URLs**: Immer die Route-Konstanten verwenden
2. **Konsistente Namensgebung**: Gleiche Namen in TS und Python
3. **RESTful Patterns**: Standard HTTP-Verben verwenden
4. **Versionierung**: Bei Breaking Changes Version erhöhen
5. **Dokumentation**: Neue Routen immer dokumentieren

## Zusammenfassung

Diese Lösung eliminiert die Konflikte zwischen Frontend und Backend durch:
- Zentrale Route-Definition
- Konsistente Pfadstruktur
- Einfache Wartung
- Type-Safety im Frontend
- Klare Trennung von Konfiguration und Implementierung