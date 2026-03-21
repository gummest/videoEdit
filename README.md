# Video Edit - Video Processing Platform

A full-stack video editing platform with Twitch integration. Upload local videos or import from Twitch, then process them with smart segment extraction.

## Features

### 🎬 Local Video Upload
- Drag-and-drop or browse to upload
- Support for MP4, AVI, MOV, MKV, WebM, and more
- Max file size: 2GB (configurable)
- Real-time video preview and metadata extraction

### 📺 Twitch Integration
- Browse any Twitch channel's VODs and clips
- Search by channel login
- Filter clips by date range or fetch all-time
- One-click import of clips for editing
- Thumbnail previews and metadata display

### ✂️ Smart Video Processing
- Extract and merge segments from beginning, middle, and end
- Preset configurations (30s/1min summaries)
- Custom configuration support
- FFmpeg-powered processing
- Auto cleanup of temporary files

## Project Structure

```
videoEdit/
├── apps/
│   ├── api/              # Node.js + Express backend
│   │   ├── src/
│   │   │   ├── index.js           # Main server + API endpoints
│   │   │   ├── twitchClient.js    # Twitch API integration
│   │   │   ├── videoProcessor.js  # Video processing logic
│   │   │   └── utils.js
│   │   ├── .env                   # Environment config (not committed)
│   │   └── package.json
│   └── web/              # React + Vite frontend
│       ├── src/
│       │   ├── App.jsx            # Main UI component
│       │   ├── App.css
│       │   └── main.jsx
│       └── package.json
├── package.json          # Root package.json for monorepo
└── README.md
```

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- FFmpeg installed on system
- Twitch Developer App credentials (for Twitch features)

### Installation

```bash
# Install all dependencies
npm run build

# Or install individually:
cd apps/api && npm install
cd apps/web && npm install
```

### Configuration

Create `apps/api/.env`:

```env
# Twitch API (required for Twitch features)
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_REDIRECT_URI=https://yourdomain.com/api/auth/twitch/callback

# Server
PORT=3001

# Upload limits
MAX_FILE_SIZE=2GB
```

### Running in Development

#### Backend
```bash
cd apps/api
npm run dev
```
Server runs on http://localhost:3001

#### Frontend
```bash
cd apps/web
npm run dev
```
Dev server runs on http://localhost:5173

### Production Build & Deploy

```bash
# Build frontend
cd apps/web
npm run build

# Start backend (serves built frontend)
cd ../api
npm start
```

Backend serves the built frontend from `apps/web/dist/` at the root URL.

## API Endpoints

### Video Processing
- `POST /api/process` - Process video with segment extraction
  - Body: `video` (file), `totalLength` (seconds), `cutDuration` (seconds)
  - Response: Processed video file

### Twitch Integration
- `GET /api/twitch/library` - List channel VODs and clips
  - Params: `login`, `clipStart`, `clipEnd`, `includeAllClips`
  - Response: JSON with broadcaster info, VODs, and clips

- `GET /api/twitch/clip-download` - Download Twitch clip
  - Params: `clipId`
  - Response: MP4 video file

### Health Check
- `GET /health` or `GET /api/health` - API health status

## Tech Stack

### Backend
- Node.js 22.x
- Express 4.x
- fluent-ffmpeg (video processing)
- Twitch Helix API (OAuth + data fetching)

### Frontend
- React 19.2
- Vite 7.3
- Axios 1.13
- Tailwind CSS 3.4

## Environment Variables

### Backend (`apps/api/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `MAX_FILE_SIZE` | Max upload size | `2GB` |
| `TWITCH_CLIENT_ID` | Twitch app client ID | Required for Twitch |
| `TWITCH_CLIENT_SECRET` | Twitch app secret | Required for Twitch |
| `TWITCH_REDIRECT_URI` | OAuth redirect URI | - |

### Frontend (`apps/web/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_MAX_FILE_SIZE` | Client-side upload limit | `2GB` |

## Usage

### 1. Local Upload Workflow
1. Click "Local Upload" tab
2. Drag & drop or browse for video file
3. Select preset or configure custom settings
4. Click "Process Video"
5. Download processed result

### 2. Twitch Import Workflow
1. Click "Twitch Library" tab
2. Enter Twitch channel login (e.g., "shroud")
3. Choose clip range (All Time or Date Range)
4. Click "Load Twitch Videos"
5. Browse VODs and clips
6. Click "Import Clip" on desired clip
7. Automatically switches to Local Upload with imported video
8. Configure and process as normal

## Deployment Notes

- Backend `.env` should be injected via environment variables in production
- Frontend build output (`apps/web/dist/`) is served by backend
- Ensure Twitch redirect URI matches production domain
- FFmpeg must be installed on production server

## License

MIT

## Support

For issues or questions, please open a GitHub issue.
