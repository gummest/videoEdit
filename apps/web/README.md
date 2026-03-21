# Video Editor - Frontend

React SPA for uploading, configuring, and processing videos.

## Features

### Local Upload
- **File Upload**: Drag-and-drop or click to upload video files (max 2GB)
- **Video Preview**: Shows file name, size, and duration
- **Preset Configurations**:
  - Quick 30s (3s cuts)
  - 1 min summary (5s cuts)
  - Custom configuration
- **Processing**: Sends video + config to `POST /api/process`
- **Result Display**: Video preview and download button

### Twitch Library
- **Channel Search**: Enter Twitch channel login to load VODs and clips
- **Clip Range Selection**: Choose "All Time" or custom date range
- **VOD Browser**: Browse all archive videos with thumbnails
- **Clip Browser**: Browse clips with thumbnails, titles, and metadata
- **One-Click Import**: Import any clip directly to local editor
- **Direct Links**: Open videos/clips in Twitch

## Development

```bash
# Install dependencies (use NODE_ENV=development to install devDependencies)
NODE_ENV=development npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

- `VITE_MAX_FILE_SIZE`: Max upload size for client-side validation (e.g. `500mb`, `2gb`, or bytes). Defaults to 2GB.

## Tech Stack

- React 19.2
- Vite 7.3
- Axios 1.13
- Plain CSS (custom styling)

## API Integration

The app expects these backend API endpoints:

### POST /api/process
- Content-Type: multipart/form-data
- Body:
  - `video`: Video file
  - `totalLength`: Total output length in seconds
  - `cutDuration`: Duration of each cut in seconds
- Response: Video blob (video/mp4)

### GET /api/twitch/library
- Query Params:
  - `login`: Twitch channel login
  - `clipStart`: ISO date (optional)
  - `clipEnd`: ISO date (optional)
  - `includeAllClips`: boolean (default: true)
- Response: JSON with broadcaster info, VODs, and clips

### GET /api/twitch/clip-download
- Query Params:
  - `clipId`: Twitch clip ID
- Response: Video blob (video/mp4)

## File Structure

```
apps/web/
├── src/
│   ├── App.jsx          # Main component with upload/config/result UI
│   ├── App.css          # Custom CSS styles
│   ├── index.css        # Base styles
│   └── main.jsx         # Entry point
├── public/              # Static assets
├── dist/                # Production build output
├── package.json
├── vite.config.js
└── README.md
```

## Components

### Tab Switcher
- Toggle between "Local Upload" and "Twitch Library"
- Preserves state when switching tabs

### Upload Zone (Local Upload Tab)
- Drag & drop support
- File type validation (video/* only)
- Size validation (2GB max)
- Duration extraction from video metadata

### Twitch Library (Twitch Library Tab)
- Channel input field
- Clip range selector (All Time / Date Range)
- Date pickers for custom range
- Load button with loading state
- Broadcaster profile card (avatar, name, stats)
- VOD grid with thumbnails
- Clip grid with thumbnails
- Import buttons with loading state

### Configuration Form
- Three preset options (radio buttons)
- Custom inputs for total length and cut duration
- Real-time calculation of number of cuts
- Input validation

### Process Button
- Loading state during API call
- Error handling and display
- Disabled when loading

### Result Display
- Video preview player
- Download button
- Error messages if processing fails

## Build Output

The production build creates static files in `dist/` that can be served by any web server or integrated with the Node.js backend.

## Notes

- If dependencies don't install properly, use: `NODE_ENV=development npm install`
- API endpoint can be configured via proxy in `vite.config.js` or environment variables
- Video duration extraction happens client-side using HTML5 video metadata
