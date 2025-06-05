# Port Standardization Summary

## Overview
All port configurations have been standardized across the nscale-assist application to avoid conflicts and ensure consistency.

## Standardized Ports
- **Python Backend API**: Port **8000** (changed from 8080)
- **Vite Frontend Dev Server**: Port **5173** (changed from 3000)

## Files Updated

### Backend Configuration
1. **`/opt/nscale-assist/app/modules/core/config.py`**
   - Changed default PORT from 8080 to 8000

### Frontend Configuration
2. **`/opt/nscale-assist/app/.env`**
   - `VITE_API_URL=http://localhost:8000` (already correct)
   - `VITE_PORT=5173` (changed from 3000)

3. **`/opt/nscale-assist/app/.env.development`**
   - `VITE_API_URL=http://localhost:8000` (changed from 8080)
   - `VITE_PORT=5173` (changed from 3000)

4. **`/opt/nscale-assist/app/vite.config.ts`**
   - Default server port changed from 3000 to 5173
   - API proxy target remains http://localhost:8000

### Docker Configuration
5. **`/opt/nscale-assist/app/docker-compose.yml`**
   - Port mapping changed from `8080:8080` to `8000:8000`
   - API_BASE_URL default changed to http://localhost:8000
   - Health check URL updated to http://localhost:8000/health

6. **`/opt/nscale-assist/app/docker-compose.production.yml`**
   - Already correctly configured with port 8000 for backend

### Source Code Updates
7. **`/opt/nscale-assist/app/src/utils/fixAxiosBaseURL.ts`**
   - Updated to handle both old ports (8080 and 3000) and redirect to correct API endpoint

## Migration Steps

### For Development
1. Stop any services running on old ports:
   ```bash
   # Kill processes on old ports
   lsof -ti :8080 | xargs -r kill -9
   lsof -ti :3000 | xargs -r kill -9
   ```

2. Start backend on new port:
   ```bash
   cd /opt/nscale-assist/app
   export PORT=8000
   python -m api.server
   ```

3. Start frontend on new port:
   ```bash
   cd /opt/nscale-assist/app
   export VITE_PORT=5173
   npm run dev
   ```

### For Docker
```bash
# Rebuild and start with new ports
docker-compose down
docker-compose build
docker-compose up -d
```

## Verification
Use the provided script to verify configuration:
```bash
/opt/nscale-assist/app/scripts/update-ports.sh
```

## Important Notes
- The production docker-compose file was already using port 8000
- All hardcoded port references have been updated or made configurable
- The axios interceptor will automatically fix any remaining incorrect URLs
- Environment variables take precedence over default values

## Access URLs After Migration
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Rollback (if needed)
To rollback to old ports, set these environment variables:
```bash
export PORT=8080  # For backend
export VITE_PORT=3000  # For frontend
```

However, this is not recommended as the codebase has been standardized to use the new ports.