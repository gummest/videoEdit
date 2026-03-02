# Video Editor - Frontend

React SPA for uploading, configuring, and processing videos.

## Features

- **File Upload**: Drag-and-drop or click to upload video files (max 2GB)
- **Video Preview**: Shows file name, size, and duration
- **Preset Configurations**:
  - Quick 30s (3s cuts)
  - 1 min summary (5s cuts)
  - Custom configuration
- **Processing**: Sends video + config to `POST /api/process`
- **Result Display**: Video preview and download button

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

## Tech Stack

- React 19.2
- Vite 7.3
- Axios 1.13
- Plain CSS (custom styling)

## API Integration

The app expects a backend API endpoint:

**POST /api/process**
- Content-Type: multipart/form-data
- Body:
  - `video`: Video file
  - `totalLength`: Total output length in seconds
  - `cutDuration`: Duration of each cut in seconds
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

### Upload Zone
- Drag & drop support
- File type validation (video/* only)
- Size validation (2GB max)
- Duration extraction from video metadata

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
