# Video Processing API

Backend service for processing videos with smart segment extraction and merging.

## Features

- **Video Upload**: Accepts video files up to 2GB by default (configurable)
- **Smart Segmentation**: Extracts segments from beginning, middle, and end of video
- **FFmpeg Processing**: Uses fluent-ffmpeg for efficient video manipulation
- **Auto Cleanup**: Removes temporary files after processing
- **Error Handling**: Graceful error handling with informative messages

## API Endpoints

### `POST /api/process`

Process a video file by extracting and merging segments.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `video`: Video file (required)
  - `totalLength`: Desired output length in seconds (required)
  - `cutDuration`: Duration of each cut in seconds (required)

**Response:**
- Success: Video file download
- Error: JSON with error message

**Example using curl:**
```bash
curl -X POST http://localhost:3000/api/process \
  -F "video=@input.mp4" \
  -F "totalLength=30" \
  -F "cutDuration=3" \
  --output processed.mp4
```

### `GET /health` or `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "video-processing-api"
}
```

### `GET /api/twitch/library`

List Twitch VODs (archives) and clips for a channel.

**Query Params:**
- `login`: Twitch channel login (required unless `broadcasterId` provided)
- `broadcasterId`: Twitch broadcaster ID (optional alternative)
- `clipStart`: ISO date (e.g. `2026-03-01`) for clip range
- `clipEnd`: ISO date (e.g. `2026-03-20`) for clip range

**Response:**
```json
{
  "broadcaster": {
    "id": "123",
    "login": "creator",
    "displayName": "Creator",
    "profileImageUrl": "https://..."
  },
  "vods": [],
  "clips": [],
  "clipWindow": {
    "start": "2026-03-01T00:00:00.000Z",
    "end": "2026-03-20T00:00:00.000Z"
  }
}
```

### `GET /api/twitch/clip-download`

Download a Twitch clip MP4 via the backend.

**Query Params:**
- `clipId`: Twitch clip ID

**Response:**
- Success: MP4 file stream
- Error: JSON with error message

## Installation

```bash
npm install
```

## Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `MAX_FILE_SIZE`: Max upload size (e.g. `500mb`, `2gb`, or bytes). Defaults to 2GB.
- `TWITCH_CLIENT_ID`: Twitch app client ID (required for Twitch endpoints)
- `TWITCH_CLIENT_SECRET`: Twitch app client secret (required for Twitch endpoints)

Twitch access tokens are stored in memory only and refreshed as needed.

## Algorithm

1. **Calculate cuts**: `totalCuts = totalLength / cutDuration`
2. **Distribute cuts** evenly across three sections:
   - Beginning: First 1/3 of cuts from start of video
   - Middle: 1/3 of cuts from center of video
   - End: Last 1/3 of cuts from end of video
3. **Extract segments** using FFmpeg
4. **Concatenate** all segments into final output
5. **Cleanup** temporary files

## Requirements

- Node.js >= 18.0.0
- FFmpeg installed on the system

## Error Handling

- Invalid file type → 400 Bad Request
- File too large (exceeds configured limit) → 413 Payload Too Large
- Invalid parameters → 400 Bad Request
- Processing error → 500 Internal Server Error
