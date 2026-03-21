# Quick Start Guide - videoEdit

## 🚀 5-Minute Setup

### 1. Install Dependencies
```bash
cd /data/workspace/videoEdit
npm run build  # Installs both frontend and backend
```

### 2. Configure Twitch (Optional)
```bash
cd apps/api
cat > .env << 'EOF'
TWITCH_CLIENT_ID=0bitvbvzvjjmr5ndd1kpqh9474vaqh
TWITCH_CLIENT_SECRET=hpvt7nen6y0iqurkc6bokcm36d8xnl
TWITCH_REDIRECT_URI=https://edit.mesutapps.online/api/auth/twitch/callback
PORT=3001
MAX_FILE_SIZE=2GB
EOF
```

### 3. Start Backend
```bash
cd /data/workspace/videoEdit/apps/api
npm start
```
✅ Server running on http://localhost:3001

### 4. Start Frontend (Development)
```bash
# In a new terminal
cd /data/workspace/videoEdit/apps/web
npm run dev
```
✅ Frontend running on http://localhost:5173

---

## 🧪 Quick Test

### Test Backend Health
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","service":"video-processing-api"}
```

### Test Twitch Integration
```bash
curl "http://localhost:3001/api/twitch/library?login=xqc&includeAllClips=false" | head -c 500
# Expected: JSON with broadcaster info, VODs, and clips
```

---

## 📦 Production Deployment

### Option 1: All-in-One (Backend serves Frontend)
```bash
# 1. Build frontend
cd /data/workspace/videoEdit/apps/web
npm run build

# 2. Start backend (serves frontend at root)
cd ../api
npm start
```
✅ Visit http://localhost:3001

### Option 2: Separate Frontend & Backend
```bash
# Backend
cd apps/api
PORT=3001 npm start

# Frontend (separate server)
cd apps/web
npm run preview  # Serves production build
```

---

## 🎬 Using the App

### Local Upload
1. Open http://localhost:5173 (dev) or http://localhost:3001 (production)
2. Click **"Local Upload"** tab
3. Drag & drop a video file
4. Select preset or configure custom
5. Click **"Process Video"**
6. Download result

### Twitch Import
1. Click **"Twitch Library"** tab
2. Enter channel name (e.g., "shroud")
3. Click **"Load Twitch Videos"**
4. Browse clips, click **"Import Clip"**
5. Process as normal

---

## 🔧 Troubleshooting

### Port 3001 already in use?
```bash
# Change port in .env
echo "PORT=3002" >> apps/api/.env
```

### FFmpeg not found?
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y ffmpeg

# macOS
brew install ffmpeg

# Check installation
ffmpeg -version
```

### Twitch API errors?
- Verify `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` in `.env`
- Check network connectivity
- Ensure credentials are valid

### Frontend can't connect to backend?
- Check `vite.config.js` proxy settings
- Ensure backend is running on expected port
- Check CORS settings in `apps/api/src/index.js`

---

## 📁 File Locations

| What | Where |
|------|-------|
| Backend code | `/data/workspace/videoEdit/apps/api/src/` |
| Frontend code | `/data/workspace/videoEdit/apps/web/src/` |
| Environment config | `/data/workspace/videoEdit/apps/api/.env` |
| Uploaded videos (temp) | `/data/workspace/videoEdit/apps/api/uploads/` |
| Frontend build | `/data/workspace/videoEdit/apps/web/dist/` |

---

## 🎯 Next Steps

- [ ] Customize preset configurations in `apps/web/src/App.jsx`
- [ ] Add authentication/authorization
- [ ] Deploy to production server
- [ ] Configure Cloudflare/reverse proxy
- [ ] Set up monitoring and logging
- [ ] Add more video processing features

---

**Need help?** Check the main [README.md](./README.md) or integration report [TWITCH_INTEGRATION_REPORT.md](./TWITCH_INTEGRATION_REPORT.md)
