# Port Configuration - nscale-assist

## ✅ Standardized Ports

The application is now configured to use these standard ports:

- **Backend (Python/FastAPI)**: Port **8000**
- **Frontend (Vite)**: Port **5173**

## 🚀 Starting the Application

### Option 1: Use the startup script (Recommended)
```bash
cd /opt/nscale-assist/app
./start-dev.sh
```

To stop all servers:
```bash
./start-dev.sh --kill
```

### Option 2: Manual start
```bash
# Terminal 1 - Backend
cd /opt/nscale-assist/app
python3 api/server.py

# Terminal 2 - Frontend
cd /opt/nscale-assist/app
npm run dev
```

## 📝 What was changed

1. **Python Backend**:
   - `modules/core/config.py`: Changed `PORT = 8080` to `PORT = 8000`
   - All Docker configurations updated

2. **Frontend**:
   - `.env` files: Updated `VITE_API_URL` to use port 8000
   - `vite.config.ts`: Proxy configuration points to port 8000
   - Frontend dev server uses Vite's default port 5173

3. **Fixed hardcoded references**:
   - Created `fixAxiosBaseURL.ts` to handle any legacy port references
   - No more conflicts between different port configurations

## 🔍 Verify Configuration

Run the test script to verify all configurations:
```bash
python3 test_port_config.py
```

## 🌐 Access URLs

Once started:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **API Documentation**: http://localhost:8000/docs

## ⚠️ Troubleshooting

If you see "Port already in use" errors:

1. Check what's using the ports:
   ```bash
   lsof -i :8000
   lsof -i :5173
   ```

2. Kill the processes or use:
   ```bash
   ./start-dev.sh --kill
   ```

## 📋 Environment Variables

The application uses these environment files:
- `.env` - General configuration
- `.env.development` - Development overrides
- `.env.production` - Production settings

All are configured to use the standardized ports.