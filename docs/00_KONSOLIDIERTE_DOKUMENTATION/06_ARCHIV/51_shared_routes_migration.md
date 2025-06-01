# Migration zu Shared Routes - Schrittweise Anleitung

## Status
- ✅ Shared Route-Dateien erstellt (`/shared/api-routes.ts` und `/api/routes_config.py`)
- ✅ Vite-Konfiguration aktualisiert (Alias für `@/shared` hinzugefügt)
- ✅ TypeScript-Konfiguration aktualisiert (includes für `shared/**/*.ts`)
- ✅ API config.ts temporär zurückgesetzt (funktioniert ohne shared routes)

## Nächste Schritte

### 1. Server starten und testen
```bash
# Backend starten
cd api
python server.py > server.log 2>&1 &
cd ..

# Frontend starten
npm run dev
```

### 2. Prüfen ob alles funktioniert
- Öffnen Sie http://localhost:3003
- Prüfen Sie die Browser-Konsole auf Fehler
- Testen Sie Login und Admin-Panel

### 3. Schrittweise Migration (wenn alles läuft)

#### Phase 1: Backend Migration
```bash
cd api
python update_server_routes.py
# Review server_updated.py
mv server_updated.py server.py
# Restart server
pkill -f 'python.*server.py'
python server.py > server.log 2>&1 &
cd ..
```

#### Phase 2: Frontend Migration
Nach erfolgreichem Backend-Update:
```bash
# Backup current config
cp src/services/api/config.ts src/services/api/config.ts.working

# Apply shared routes config
cp src/services/api/config.ts.shared-backup src/services/api/config.ts

# Restart dev server
# Ctrl+C to stop, then:
npm run dev
```

### 4. Troubleshooting

#### Import-Fehler beheben
Falls `@/shared/api-routes` nicht gefunden wird:
1. Prüfen Sie, ob `/shared/api-routes.ts` existiert
2. Prüfen Sie vite.config.js für den Alias
3. Prüfen Sie tsconfig.json für includes

#### API-Pfad-Probleme
Falls API-Aufrufe fehlschlagen:
1. Prüfen Sie Browser Network Tab
2. Vergleichen Sie alte vs neue URLs
3. Prüfen Sie Server-Logs

### 5. Rollback bei Problemen
```bash
# Frontend rollback
cp src/services/api/config.ts.working src/services/api/config.ts

# Backend rollback
cp api/server.py.backup-* api/server.py
pkill -f 'python.*server.py'
cd api && python server.py > server.log 2>&1 &
```

## Vorteile nach Migration
- ✅ Zentrale Pfad-Definition
- ✅ Keine Konflikte mehr zwischen Frontend/Backend
- ✅ Type-Safety für alle Routes
- ✅ Einfachere Wartung
- ✅ Konsistente API-Versionierung