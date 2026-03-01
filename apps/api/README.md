# Video Processing API

Backend service for processing videos with smart segment extraction and merging.

## Features

- **Video Upload**: Accepts video files up to 500MB
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

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "video-processing-api"
}
```

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
- File too large (>500MB) → 413 Payload Too Large
- Invalid parameters → 400 Bad Request
- Processing error → 500 Internal Server Error
