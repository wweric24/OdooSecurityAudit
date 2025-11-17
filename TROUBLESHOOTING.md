# Troubleshooting Guide

## Servers Not Showing in Browser

If you can't see the application in your browser, try these steps:

### 1. Check if Servers are Running

**Backend**:
```powershell
# Check if port 8000 is in use
netstat -ano | findstr ":8000"

# Test backend directly
Invoke-WebRequest -Uri "http://localhost:8000/api/stats"
```

**Frontend**:
```powershell
# Check if port 3000 is in use
netstat -ano | findstr ":3000"

# Test frontend
Invoke-WebRequest -Uri "http://localhost:3000"
```

### 2. Start Servers Manually

**Backend** (in one terminal):
```bash
cd "C:\Users\eric.riddle\AI FORGE\Odoo Security"
python -m uvicorn app.backend.api:app --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Frontend** (in another terminal):
```bash
cd "C:\Users\eric.riddle\AI FORGE\Odoo Security\app\frontend"
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 3. Verify URLs

- **Backend API**: http://localhost:8000
- **Backend Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000

### 4. Common Issues

#### Port Already in Use
If you get "port already in use" errors:
```powershell
# Find process using port 8000
netstat -ano | findstr ":8000"
# Note the PID, then kill it:
taskkill /PID <PID> /F

# Same for port 3000
netstat -ano | findstr ":3000"
taskkill /PID <PID> /F
```

#### Firewall Blocking
Windows Firewall might be blocking the ports. Check Windows Firewall settings.

#### Browser Cache
Try:
- Hard refresh: Ctrl+F5
- Incognito/Private mode
- Different browser

#### CORS Issues
If you see CORS errors in browser console, the backend CORS is configured but make sure:
- Backend is running on port 8000
- Frontend is running on port 3000
- Both are using localhost (not 127.0.0.1)

### 5. Check Logs

**Backend logs** will show in the terminal where you started it.

**Frontend logs** will show in the terminal where you started it, and also in browser console (F12).

### 6. Verify Installation

```powershell
# Check Python packages
python -c "import fastapi, sqlalchemy; print('Dependencies OK')"

# Check Node packages
cd app/frontend
npm list --depth=0
```

### 7. Restart Everything

1. Close all terminals
2. Kill any Python/Node processes:
   ```powershell
   taskkill /F /IM python.exe
   taskkill /F /IM node.exe
   ```
3. Start backend in one terminal
4. Start frontend in another terminal
5. Wait 10-15 seconds for both to fully start
6. Open http://localhost:3000 in browser

### 8. Alternative: Use Different Ports

If ports 8000/3000 are problematic:

**Backend** (change port to 8001):
```bash
python -m uvicorn app.backend.api:app --host 0.0.0.0 --port 8001
```

**Frontend** (edit `app/frontend/vite.config.js`):
```javascript
server: {
  port: 3001,
  proxy: {
    '/api': {
      target: 'http://localhost:8001',  // Match backend port
      changeOrigin: true
    }
  }
}
```

Then access: http://localhost:3001

## Still Having Issues?

1. Check that both servers show "started" messages in their terminals
2. Verify no error messages in terminal output
3. Check browser console (F12) for JavaScript errors
4. Try accessing backend directly: http://localhost:8000/docs
5. Make sure you're using `localhost` not `127.0.0.1` or IP address

