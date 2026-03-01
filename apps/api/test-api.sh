#!/bin/bash

# Video Processing API Test Script
# Usage: ./test-api.sh [video-file]

API_URL="${API_URL:-http://localhost:3000}"
VIDEO_FILE="${1:-test-video.mp4}"
TOTAL_LENGTH="${TOTAL_LENGTH:-30}"
CUT_DURATION="${CUT_DURATION:-3}"

echo "================================"
echo "Video Processing API Test"
echo "================================"
echo "API URL: $API_URL"
echo "Video File: $VIDEO_FILE"
echo "Total Length: ${TOTAL_LENGTH}s"
echo "Cut Duration: ${CUT_DURATION}s"
echo "================================"

# Check if video file exists
if [ ! -f "$VIDEO_FILE" ]; then
    echo "Error: Video file '$VIDEO_FILE' not found"
    echo "Usage: ./test-api.sh <path-to-video.mp4>"
    exit 1
fi

# Test health endpoint
echo -e "\n1. Testing health endpoint..."
curl -s "$API_URL/health" | jq '.' || echo "Health check failed"

# Test video processing
echo -e "\n2. Processing video..."
echo "This may take a while depending on video size..."

curl -X POST "$API_URL/api/process" \
  -F "video=@$VIDEO_FILE" \
  -F "totalLength=$TOTAL_LENGTH" \
  -F "cutDuration=$CUT_DURATION" \
  --output "processed_output.mp4" \
  -w "\nHTTP Status: %{http_code}\n" \
  --progress-bar

if [ -f "processed_output.mp4" ]; then
    FILE_SIZE=$(ls -lh processed_output.mp4 | awk '{print $5}')
    echo "✅ Success! Output file: processed_output.mp4 ($FILE_SIZE)"
    
    # Try to get video info if ffprobe is available
    if command -v ffprobe &> /dev/null; then
        echo -e "\nOutput video info:"
        ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 processed_output.mp4
    fi
else
    echo "❌ Failed to process video"
    exit 1
fi

echo -e "\n================================"
echo "Test complete!"
echo "================================"
